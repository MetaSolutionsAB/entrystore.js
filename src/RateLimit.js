/**
 * The class regulates how often requests are made to avoid overshooting a specified rate limitation.
 * The class supports two approaches, the naive and the burst methods.
 *
 * Naive approach
 * --------------
 * The naive approach for a rate limitation implementation is to evenly distribute the request limit over
 * the entire time period and then whenever requests are made quicker simply delay them. This approach
 * is unfortunately often suboptimal as we often need to make requests in bursts separated by longer
 * periods of inactivity.
 *
 * Burst approach
 * --------------
 * The burst approach divides the time period into buckets and for each bucket a budget of how many
 * requests that can be made is calculated, it is possible to specify that there will be a minimum amount of
 * burst requests reserved per bucket. If the budget is surpassed the class will regulate how often requests
 * are made to keep the number below the specified rate limitation. The minimum amount of requests per second
 * can be specified separately.
 *
 * The burst algorithm has the following characteristics:
 * 1. Over a full time period the amount of requests will never exceed the maximum request limit.
 * 2. Due to the division into buckets and in what frequency we make the requests we often end up being allowed
 *    to make fewer requests in total. For instance with three buckets and 3600 seconds and 3600 requests we end up
 *    with 2850 requests if try to make them one per second, i.e. only around 80% of our total request limit.
 * 3. We will always be allowed to make requests, there will never be a full stop.
 * 4. The guaranteed amount of requests per second is by default requestLimit / (timePeriod * 2)
 *
 * Use the burst approach for webb applications when you know that the pattern for requests are intermittent
 * and you care about responsiveness. Use the naive approach in batch mode when you want to push as many requests
 * through as possible over a longer period of time.
 *
 * @exports store/RateLimit
 */
export default class RateLimit {

  /**
   *
   * @param {Object} [options] an options object
   * @param {number} [options.timePeriod=3600] - the time period to check, expressed in seconds
   * @param {number} [options.requestLimit=3600] - the amount of allowed requests per time period
   * @param {number} [options.bucketCount=12] - the amount of buckets to divide the time period into
   * @param {number} [options.minimumBurstPerBucket] - the minimum amount of requests per bucket reserved to be sent
   * before rate limitation is applied, by default this is calculated from the requestLimit per bucket divided by 12.
   * @param {number} [options.rateLimitationSpeed] - the amount of requests per second in rate limitation mode,
   * i.e. when the allowed burst is consumed, this value is only used in burst mode.
   * @param {string} [options.mode=burst] - the rate limit approach taken, supports 'naive' and 'burst'
   * @param {boolean} [history=false] - weather the request history per bucket will be saved in an array
   */
  constructor({ timePeriod = 3600, requestLimit = 4896, bucketCount = 12, mode = 'burst', minimumBurstPerBucket, rateLimitationSpeed} = {}, history = false) {
    this._timePeriod = timePeriod;
    this._requestLimit = requestLimit;
    this._bucketCount = bucketCount;
    this._bucketMode = mode === 'burst';
    // Weather we are rate limiting right now.
    // We always do rate limiting if we are in naive mode, otherwise we start by not limiting.
    this._limit = !this._bucketMode;

    // Initialize buckets
    this._buckets = [];
    for (let i = 0; i < this._bucketCount; i++) {
      this._buckets[i] = 0;
    }
    // By default rate is half the allowed requests per bucket
    this._rate = Math.floor(rateLimitationSpeed !== undefined ? rateLimitationSpeed * timePeriod / bucketCount :
      requestLimit / (this._bucketCount * 2));

    // By default burst rate is a sixth of the default rate of the allowed requests per bucket
    this._burst = Math.floor(minimumBurstPerBucket !== undefined ? minimumBurstPerBucket : requestLimit / (this._bucketCount * 12));

    // waitTime is the time to wait between requests in limit mode expressed in milliseconds
    this._waitTime = this._bucketMode ? timePeriod / bucketCount / this._rate * 1000 :
      timePeriod * 1000 / requestLimit ;

    // Start time for last bucket.
    this._bucketStartTime = new Date().getTime();
    this._bucketTimeLength = timePeriod / bucketCount;
    this.calculateBudget();

    // Set a faked last request back in time so we won't delay the first request if we are in naive mode.
    this._lastRequestTime = new Date().getTime() - 2 * this._waitTime;

    // a queue of functions corresponding to requests to make.
    this._queue = [];

    // listeners that will be notified when we are in rate limitation mode and when we leave it.
    this._listeners = [];

    // If required, turn on history
    if (history) {
      this._history = [];
    }
  }

  /**
   * The history is an array of buckets where requests have been made,
   * each past bucket is documented in the history with an object with attributes:
   * * amount - amount of requests made in the bucket.
   * * time - time the bucket started.
   * * limitAt - time when the bucket switched over from burst to rate limitation mode, may not exist.
   *
   * @returns {Object[]}
   */
  history() {
    return this._history;
  }

  /**
   * Calculates the budget for the upcoming bucket.
   * The calculation is assumed to be done before any requests are made for the upcoming bucket.
   * The calculation is made by forecasting the budget per bucket (*) in the coming time period.
   * The current budget is the smallest of these bucket budgets and then subtracting the "rate" (**).
   *
   * (*) The forecast for bucket X is done by subtracting the amount of requests already made during the
   *     previous time period (before X). When subtracting from buckets that lie in the future we assume "rate"
   *     amount of requests as that is something we have to guarantee.
   *
   * (**) This subtraction is done to avoid overshooting the budget by consuming the budget in the first millisecond
   * and then consuming "rate" number of requests in rate limitation mode.
   * @private
   */
  calculateBudget() {
    this._budget = this._requestLimit;
    for (let remainIdx = 1; remainIdx <= this._bucketCount; remainIdx++) {
      let remaining = this._requestLimit - (this._rate + this._burst) * remainIdx;
      for (let bucketIdx = remainIdx - 1; bucketIdx < this._bucketCount; bucketIdx++) {
        remaining -= this._buckets[bucketIdx];
      }
      if (remaining < this._budget) {
        this._budget = remaining;
      }
    }
    this._budget -= this._rate;
    if (this._budget < this._burst) {
      this._budget = this._burst;
    }
  }

  /**
   * Shift buckets a fixed amount of steps, i.e. forget an amount of buckets
   * and prepare an equal amount of new buckets by setting them to zero.
   *
   * @param {number} amount the amount of buckets to forget
   * @private
   */
  forgetBuckets(amount = 1) {
    if (this._history) {
      for (let a = 0; a < amount; a++) {
        if (this._buckets[a] > 0) {
          this._history.push({
            amount: this._buckets[a],
            time: this._bucketStartTime.getTime() / 1000 + this._bucketTimeLength * a
          });
          if (this._lastLimitPoint) {
            this._history[this._history.length - 1].limitAt = this._lastLimitPoint;
          }
        }
      }
    }
    delete this._lastLimitPoint;
    this._buckets.splice(0, amount);
    const from = amount > this._bucketCount ? 0 : this._bucketCount - amount;
    for (let i = from ; i < this._bucketCount; i++) {
      this._buckets[i] = 0;
    }
  }

  /**
   * Every time a request is made we need to tick. It does the following:
   * 1. If neccessary, shift buckets.
   * 2. Keep track of the last request time.
   * 3. Keep track of amount of requests in the bucket list.
   * 4. Notfies listeners if we are starting or stopping rate limitation (not in naive mode).
   *
   * @private
   */
  tick() {
    this._lastRequestTime = new Date().getTime();
    if (this._bucketMode) {
      const diff = (this._lastRequestTime - this._bucketStartTime) / 1000;
      // Check if we need to shift buckets
      if (diff > this._bucketTimeLength) {
        const steps = Math.floor(diff / this._bucketTimeLength);
        this.forgetBuckets(steps);
        this._bucketStartTime += steps * this._bucketTimeLength;
        this.calculateBudget();
      }
      this._buckets[this._bucketCount - 1] += 1;
      const isLimitedNow = this._buckets[this._bucketCount - 1] >= this._budget;
      if (isLimitedNow && !this._limit) {
        // Notify listeners that we are starting to do rate limitation
        this._lastLimitPoint = this._lastRequestTime;
        this._listeners.forEach(listener => listener(true));
      } else if (!isLimitedNow && this._limit) {
        // Notify listeners that we stopped to do rate limitation
        this._listeners.forEach(listener => listener(false));
      }
      this._limit = isLimitedNow;
    }
  }


  /**
   * Handles the queue of requests by either calling them or postponing via timeouts
   * and then calling itself recursivel from that timeout.
   * @private
   */
  process() {
    while (this._queue.length > 0 && !this.timeout) {
      const {func, resolve, reject} = this._queue.shift();
      if (this._limit) {
        this.timeout = setTimeout(() => {
          this.tick();
          func.call().then(resolve, reject);
          delete this.timeout;
          this.process();
        }, this.waitTime());
        break;
      } else {
        this.tick();
        func.call().then(resolve, reject);
      }
    }
  }

  /**
   * The time to wait before next request will be sent.
   * The time will be a number in milliseconds between 0 and the maximum wait time.
   * In naive mode the wait time is the quotient between time period and the request limit.
   * In burst mode the wait time is half of the naive mode.
   * The actual time we wait depends on how long time ago the last request was made.
   *
   * @returns {number} The time in milliseconds before next request can be sent.
   */
  waitTime() {
    if (this._limit) {
      const now = new Date().getTime();
      const diff = now - this._lastRequestTime;
      if ( diff < this._waitTime) {
        return this._waitTime - diff;
      }
    }
    return 0;
  }

  /**
   * The promise will resolve in a time frame between 0 milliseconds and the maximum wait time calculated
   * by dividing the time period with the request limit in naive mode. In burst mode the wait time is half that.
   * The actual time we wait depends on how long time ago the last request was made.
   *
   * This is a utility function that can be used by applications that wants to behave nice
   * and wait before enqueueing a lot of functions.
   *
   * @returns {Promise} The promise will be resolved when it is time to do the next request.
   */
  wait() {
    const waitTime = this._waitTime();
    if (waitTime > 0) {
      return new Promise(resolve => setTimeout(resolve, waitTime));
    }
    return Promise.resolve();
  }

  /**
   * Enqueue a request in the form of an asynchronous function, i.e. it has to return a promise.
   *
   * @param {function} fn the function to add to the queue
   * @param {object} [context] a context object that will become the "this" of the function, optional.
   * @param {array} [args] an array of arguments, optional.
   * @returns {Promise} a new potentially delayed promise with the same resolve and reject values.
   */
  enqueue(fn, context, args = []) {
    const func = context || args ? fn.bind(context, ...args) : fn;
    return new Promise((resolve, reject) => {
      this._queue.push({func, resolve, reject});
      this.process();
    });
  }

  /**
   * @returns {number} the amount of enqueued requests.
   */
  queueLength() {
    return this.timeout ? this._queue.length + 1 : 0;
  }

  /**
   * Clear the queue of requests.
   */
  clear() {
    this._queue = [];
    clearTimeout(this.timeout);
    delete this.timeout;
  }

  /**
   * Listener that will be notified if rate limitation is turned on (true is sent) or off (false is sent).
   * @param {function} listener
   */
  addListener(listener) {
    this._listeners.push(listener);
  }

  /**
   * Remove the provided rate limitation listener.
   * @param {function} listener
   */
  removeListener(listener) {
    this._listeners.splice(this._listeners.indexOf(listener), 1);
  }
}