(function (global, factory) {
	if (typeof define === "function" && define.amd) {
		define(['exports'], factory);
	} else if (typeof exports !== "undefined") {
		factory(exports);
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports);
		global.state = mod.exports;
	}
})(this, function (exports) {
	'use strict';

	Object.defineProperty(exports, "__esModule", {
		value: true
	});
	/**
  * State management behavior for components.
  * @module
  * @todo add deleteState method to support removing items from storage
  * @todo sync state and URL
  */
	var state = {

		/**
   * Store current URL object 
   * @type {object}
   */
		url: null,

		/**
   * Query string
   * @type {string}
   */
		query: null,

		/** 
   * State 
   * @type {object} 		 
   */
		state: null,

		/**
   * State change event
   * @event statechange
   * @type {object}
   * @property {object} 	newState - New state of the component.
   * @property {object} 	changed - Changed properties.
   * @todo: Link to event is broken in the docs https://github.com/jsdoc3/jsdoc/issues/1425
   */

		/**
   * A simple method to parse and store query string of the URL. Doesn't cover all edge cases. You can use Url native API instead or similar. Override when necessary.
   * @param {string} query - Query string to parse "?param1=value1&amp;param2=value2"
   * @return {object} Query string object like {param1: value1, param2: value2}
   */
		parseQuery: function parseQuery(query) {
			var i;
			if (!query) {
				return null;
			}
			if (query.slice(0, 1) == '?') {
				query = query.slice(1);
			}

			// Empty query
			this.query = this.query || {};
			for (i in this.query) {
				delete this.query[i];
			}

			var vars = query.split('&');
			for (i = 0; i < vars.length; i++) {
				var pair = vars[i].split('=');
				this.query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
			}
			return this.query;
		},

		/**
   * Called after URL is updated, defines what is reflected in the state and calls updateState
   */
		reflectState: function reflectState() {
			var params = {
				hash: this.url.hash,
				pathname: this.url.pathname
			};
			Object.assign(params, this.query);
			return params;
		},

		/**
   * Update state 
   * @param {object} newObject - Object with changes in the state to apply
   * @fires statechange
   */
		updateState: function updateState(newObject, dontPush) {
			var whatChanged;
			if (this.state) {
				var combinded = Object.create(this.state);
				Object.assign(combinded, newObject);
				for (var i in combinded) {
					if (this.state[i] != newObject[i]) {
						whatChanged = whatChanged || {};
						if (this.state[i] != newObject[i]) {
							whatChanged[i] = newObject[i];
						}
						if (newObject[i] === null) {
							delete this.state[i];
						} else if (newObject[i] !== undefined) {
							this.state[i] = newObject[i];
						}
					}
				}
			} else {
				this.state = newObject;
				whatChanged = newObject;
			}
			var event = new CustomEvent('statechange', { detail: { newState: this.state, changed: whatChanged, dontPush: dontPush } });
			this.dispatchEvent(event);
		},

		/**
   * Parse URL string into object
   * @param {string} url - String with URL to parse
   * @return {object} URL object
   */
		parseUrl: function parseUrl(url) {
			var a = document.createElement('a');
			a.href = url;
			this.url = {};

			Object.assign(this.url, {
				href: a.href,
				protocol: a.protocol,
				host: a.host,
				hostname: a.hostname,
				port: a.port,
				pathname: a.pathname,
				search: a.search,
				hash: a.hash,
				username: a.username,
				password: a.password,
				origin: a.origin
			});

			// Normalize URL (IE11 vs others)
			if (this.url.pathname && this.url.pathname.slice(0, 1) == '/') {
				this.url.pathname = this.url.pathname.slice(1);
			}
			if (this.url.search && this.url.search.slice(0, 1) == '?') {
				this.url.search = this.url.search.slice(1);
			}
			return this.url;
		},

		/**
   * React on hash changes to update the state
   * @listens hashchange
   * @deprecated 
   * @todo It is better to watch for URL changes outside of this control
   */
		watchLocation: function watchLocation() {
			var comp = this;
			window.addEventListener("hashchange", function () {
				comp.updateUrl();
			});
			window.addEventListener("popstate", function () {
				comp.updateUrl();
			});
		},

		/**
   * Save the state to the storage. By default localStorage will be used.
   * @param {string} name - Storage name to be used. Username could be used here to separate storage for multiple users.
   * @param {object=} state - What state object to use. Current state of the component will be used by default.
   */
		saveState: function saveState(name, state, exclude) {
			if (!localStorage) {
				return false;
			}
			var toSave = {};
			Object.assign(toSave, state || this.state);

			// Remove unwanted properties
			exclude = exclude || ['hash', 'pathname']; // By default we want to exclude URL based parameters from saving to localStorage.
			for (var i in exclude) {
				delete toSave[exclude[i]];
			}

			localStorage.setItem(name, JSON.stringify(toSave));
		},

		/**
   * Load state from the storage and apply to the component.
   * @param {string} name - Storage name
   */
		loadState: function loadState(name) {
			if (!localStorage) {
				return false;
			}
			var str = localStorage.getItem(name);
			if (str) {
				this.updateState(JSON.parse(str));
			}
		},

		/**
   * Convert object to URL query string like "param1=value1&param2=value2..."
   * @param {object} obj - Object to convert
   * @return {string} Query string
   */
		serialize: function serialize(obj, exclude) {
			var str = [];
			if (!obj) {
				return;
			}
			for (var p in obj) {
				if (exclude && exclude[p] !== undefined) {
					continue;
				}
				if (!obj.hasOwnProperty || obj.hasOwnProperty(p)) {
					str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				}
			}
			return str.join("&");
		},

		/**
   * Convert URL object to URL string
   * @param {object} url - Object to convert
   * @return {string} URL
   */
		joinUrl: function joinUrl(url) {
			url = url || this.url;
			if (url.href) {
				return url.href;
			};
			var newUrl = document.createElement('a');
			newUrl.href = location.href;
			Object.assign(newUrl, url);
			newUrl = null;
			return newUrl.href;
		},

		/**
   * Reflect state changes in the URL
   */
		reflectStateInUrl: function reflectStateInUrl(state, exclude) {
			var newUrl = document.createElement('a');
			state = state || this.state;
			newUrl.href = location.href;
			newUrl.pathname = state.pathname;
			newUrl.hash = state.hash;
			exclude = exclude || ['hash', 'pathname'];
			var query = {};
			for (var p in state) {
				if (exclude && exclude.indexOf(p) != -1) {
					continue;
				}
				if (!state.hasOwnProperty || state.hasOwnProperty(p)) {
					query[p] = state[p].toString();
				}
			}
			newUrl.search = this.serialize(query);
			return newUrl;
		},

		/**
   * Drives the state of the component through URL.
   * @param {string=} newUrl - New URL. Current location will be used by default		 
   */
		updateUrl: function updateUrl(newUrl) {
			this.parseUrl(newUrl || location.href);
			this.parseQuery(this.url.search);
			this.reflectState();
		},

		/**
   * Define all event listeners
   * @member
   */
		events: {
			create: function create() {
				this.watchLocation();
			}
		}
	};

	exports.default = state;
});
