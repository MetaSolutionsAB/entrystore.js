/*global define*/
define([
	"dojo/Deferred",
	"./rest"
], function(Deferred, rest) {
	
	/**
	 * @param entryInfo that defines the basics of this entry.
	 * @constructor
	 */
	var Entry = function(entryInfo) {
		this._info = entryInfo;
	};
	var en = Entry.prototype; //Shortcut, avoids having to write Entry.prototype below when defining methods.

	

	/**
	 * Deletes this entry without any option to recover it.
	 * @param recursive {Boolean} if true and the entry is a list it will delete the entire tree of lists 
	 * and all entries that is only contained in the current list or any of its child lists. 
	 * @return {Promise} which on success indicates that the deletion has succeded.
	 */
	en.del = function(recursive) {
		if (recursive === true) {
			return rest.del(this.getURI()+"?recursive=true");
		} else {
			return rest.del(this.getURI());
		}
	};
	return Entry;
});