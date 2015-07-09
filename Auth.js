/*global define*/
define(["dojo/Deferred"], function (Deferred) {

    /**
     * EntryStore is the main class that is used to connect to a running server-side EntryStore repository.
     * @exports store/Auth
     * @param {store/EntryStore} entrystore - a repository instance.
     * @class
     */
    var Auth = function (entrystore) {
        this.entrystore = entrystore;
        this._listenerCounter = 0;
        this._listenersIdx = {};
    };

    Auth.prototype.messageListeners = function(topic, obj) {
        for (var alid in this._listenersIdx) {
            if (this._listenersIdx.hasOwnProperty(alid)) {
                this._listenersIdx[alid](topic, obj);
            }
        }
    };

    var _listenerCounter = 0;
    /**
     * Adds an authentification listener, it will be notified of login and logout events.
     * @param {authListener} listener
     */
    Auth.prototype.addAuthListener = function(listener) {
        if (listener.__alid == null) {
            listener.__alid = "idx_"+_listenerCounter;
            _listenerCounter++;
        }
        this._listenersIdx[listener.__alid] = listener;
    };

    /**
     * Removes an authentification listener.
     * @param {authListener} listener
     */
    Auth.prototype.removeAuthListener = function(listener) {
        if (listener.__alid != null) {
            delete this._listenersIdx[listener.__alid];
        }
    };

    /**
     * Yields information about who currently is authenticated against the EntryStore repository.
     * @returns {userInfoPromise} - upon success an object containing attributes "user" being the username, "id" of the user entry,
     * and "homecontext" being the entry-id of the home context is provided.
     * @see {@link store/EntryStore#auth auth}
     * @see {@link store/EntryStore#logout logout}
     */
    Auth.prototype.getUserInfo = function(forceLookup) {
        if (this.userInfo && forceLookup !== true) {
            var d = new Deferred();
            d.resolve(this.userInfo);
            return d.promise;
        } else {
            if (!this._uiDef) {
                var self = this;
                delete this.userInfo;
                this._uiDef = this.entrystore._rest.get(this.entrystore._baseURI + "auth/user").then(function (userinfo) {
                    self.userInfo = userinfo;
                    delete self._uiDef;
                    return userinfo;
                });
            }
            return this._uiDef;
        }
    };

    /**
     * @returns {entryPromise} on success the entry for the currently signed in user is provided.
     */
    Auth.prototype.getUserEntry = function(forceLookup) {
        if (this.userEntry && forceLookup !== true) {
            var d = new Deferred();
            d.resolve(this.userEntry);
            return d.promise;
        } else {
            if (!this._ueDef) {
                var self = this;
                delete this.userEntry;
                this._ueDef = this.getUserInfo(forceLookup)
                    .then(function (data) {
                        return self.entrystore.getEntry(self.entrystore.getEntryURI("_principals", data.id));
                    })
                    .then(function (userEntry) {
                        self.userEntry = userEntry;
                        delete self._ueDef;
                        return userEntry;
                    });
            }
            return this._ueDef;
        }
    };

    /**
     * Authenticate using credentials containing a user, a password and an optional maxAge given in seconds.
     *
     * @param user
     * @param password
     * @param maxAge
     * @returns {xhrPromise}
     */
    Auth.prototype.login = function (user, password, maxAge) {
        if (this.userInfo && this.userInfo.user === user) {
            return this.getUserInfo();
        }
        var self = this,
            credentials = {
                base: this.entrystore.getBaseURI(),
                user: user,
                password: password,
                maxAge: maxAge
        };
        return this.entrystore.getREST().auth(credentials).then(function(data) {
            if (typeof data === "object" && data.user) {
                return data;
            } else {
                return self.entrystore._rest.get(self.entrystore._baseURI + "auth/user");
            }
        }).then(function(data) {
            if (self._uiDef) {
                self._uiDef.cancel();
            }
            if (self._ueDef) {
                self._ueDef.cancel();
            }
            self.userInfo = data;
            delete self.userEntry;
            self.entrystore.getCache().allNeedRefresh();
            self.messageListeners("login", data);
            return data;
        });
    };

    /**
     * Logout the currently authorized user.
     * @returns {xhrPromise}
     */
    Auth.prototype.logout = function () {
        if (this.userInfo && this.userInfo.user === "guest") {
            return this.getUserInfo();
        }
        var credentials = {base: this.entrystore.getBaseURI(), logout: true};
        var self = this;
        return this.entrystore.getREST().auth(credentials).then(function() {
            self.userInfo = {user: "guest", id: "_guest"};
            delete self.userEntry;
            self.entrystore.getCache().allNeedRefresh();
            self.messageListeners("logout", self.userInfo);
            return self.userInfo;
        });
    };

    return Auth;
});

/**
 * @name userInfoPromise
 * @extends xhrPromise
 * @class
 */
/**
 * @name userInfoPromise#then
 * @param {userInfoCallback} onSuccess
 * @param {xhrFailureCallback} onError
 */
/**
 * @callback userInfoCallback
 * @param {userInfo} resource
 */
/**
 * @name userInfo
 * @namespace
 * @property {string}  user                   - the username
 * @property {string}  id                     - the entry id of the users entry
 * @property {string}  homecontext            - the entry id of the users home context.
 */

/**
 * @callback authListener
 * @param {string} topic - either login or logout.
 * @param {userInfo} userInfo - an object with the current user information
 */