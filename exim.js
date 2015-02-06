(function(root, factory) {
  "use strict";
  // Set up Reflux appropriately for the environment.
  if (typeof define === 'function' && define.amd) {
    define(['exports'], function(exports) {
      return factory(root, exports);
    });
  } else if (typeof exports !== 'undefined') {
    factory(root, exports);
  } else {
    root.Exim = factory(root, {});
  }
})(this, function(root, Reflux) {
  "use strict";

  var Reflux = {};
/*!
 * EventEmitter v4.2.9 - git.io/ee
 * Oliver Caldwell
 * MIT license
 * @preserve
 */

(function () {
    'use strict';

    /**
     * Class for managing events.
     * Can be extended to provide event functionality in other classes.
     *
     * @class EventEmitter Manages event registering and emitting.
     */
    var EventEmitter = function EventEmitter() {}

    // Shortcuts to improve speed and size
    var proto = EventEmitter.prototype;
    var exports = this;
    var originalGlobalValue = EventEmitter;

    /**
     * Finds the index of the listener for the event in its storage array.
     *
     * @param {Function[]} listeners Array of listeners to search through.
     * @param {Function} listener Method to look for.
     * @return {Number} Index of the specified listener, -1 if not found
     * @api private
     */
    function indexOfListener(listeners, listener) {
        var i = listeners.length;
        while (i--) {
            if (listeners[i].listener === listener) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Alias a method while keeping the context correct, to allow for overwriting of target method.
     *
     * @param {String} name The name of the target method.
     * @return {Function} The aliased method
     * @api private
     */
    function alias(name) {
        return function aliasClosure() {
            return this[name].apply(this, arguments);
        };
    }

    /**
     * Returns the listener array for the specified event.
     * Will initialise the event object and listener arrays if required.
     * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
     * Each property in the object response is an array of listener functions.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Function[]|Object} All listener functions for the event.
     */
    proto.getListeners = function getListeners(evt) {
        var events = this._getEvents();
        var response;
        var key;

        // Return a concatenated array of all matching events if
        // the selector is a regular expression.
        if (evt instanceof RegExp) {
            response = {};
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    response[key] = events[key];
                }
            }
        }
        else {
            response = events[evt] || (events[evt] = []);
        }

        return response;
    };

    /**
     * Takes a list of listener objects and flattens it into a list of listener functions.
     *
     * @param {Object[]} listeners Raw listener objects.
     * @return {Function[]} Just the listener functions.
     */
    proto.flattenListeners = function flattenListeners(listeners) {
        var flatListeners = [];
        var i;

        for (i = 0; i < listeners.length; i += 1) {
            flatListeners.push(listeners[i].listener);
        }

        return flatListeners;
    };

    /**
     * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Object} All listener functions for an event in an object.
     */
    proto.getListenersAsObject = function getListenersAsObject(evt) {
        var listeners = this.getListeners(evt);
        var response;

        if (listeners instanceof Array) {
            response = {};
            response[evt] = listeners;
        }

        return response || listeners;
    };

    /**
     * Adds a listener function to the specified event.
     * The listener will not be added if it is a duplicate.
     * If the listener returns true then it will be removed after it is called.
     * If you pass a regular expression as the event name then the listener will be added to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListener = function addListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var listenerIsWrapped = typeof listener === 'object';
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
                listeners[key].push(listenerIsWrapped ? listener : {
                    listener: listener,
                    once: false
                });
            }
        }

        return this;
    };

    /**
     * Alias of addListener
     */
    proto.on = alias('addListener');

    /**
     * Semi-alias of addListener. It will add a listener that will be
     * automatically removed after its first execution.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addOnceListener = function addOnceListener(evt, listener) {
        return this.addListener(evt, {
            listener: listener,
            once: true
        });
    };

    /**
     * Alias of addOnceListener.
     */
    proto.once = alias('addOnceListener');

    /**
     * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
     * You need to tell it what event names should be matched by a regex.
     *
     * @param {String} evt Name of the event to create.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvent = function defineEvent(evt) {
        this.getListeners(evt);
        return this;
    };

    /**
     * Uses defineEvent to define multiple events.
     *
     * @param {String[]} evts An array of event names to define.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvents = function defineEvents(evts) {
        for (var i = 0; i < evts.length; i += 1) {
            this.defineEvent(evts[i]);
        }
        return this;
    };

    /**
     * Removes a listener function from the specified event.
     * When passed a regular expression as the event name, it will remove the listener from all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to remove the listener from.
     * @param {Function} listener Method to remove from the event.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListener = function removeListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var index;
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                index = indexOfListener(listeners[key], listener);

                if (index !== -1) {
                    listeners[key].splice(index, 1);
                }
            }
        }

        return this;
    };

    /**
     * Alias of removeListener
     */
    proto.off = alias('removeListener');

    /**
     * Adds listeners in bulk using the manipulateListeners method.
     * If you pass an object as the second argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
     * You can also pass it a regular expression to add the array of listeners to all events that match it.
     * Yeah, this function does quite a bit. That's probably a bad thing.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListeners = function addListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(false, evt, listeners);
    };

    /**
     * Removes listeners in bulk using the manipulateListeners method.
     * If you pass an object as the second argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be removed.
     * You can also pass it a regular expression to remove the listeners from all events that match it.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListeners = function removeListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(true, evt, listeners);
    };

    /**
     * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
     * The first argument will determine if the listeners are removed (true) or added (false).
     * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be added/removed.
     * You can also pass it a regular expression to manipulate the listeners of all events that match it.
     *
     * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
        var i;
        var value;
        var single = remove ? this.removeListener : this.addListener;
        var multiple = remove ? this.removeListeners : this.addListeners;

        // If evt is an object then pass each of its properties to this method
        if (typeof evt === 'object' && !(evt instanceof RegExp)) {
            for (i in evt) {
                if (evt.hasOwnProperty(i) && (value = evt[i])) {
                    // Pass the single listener straight through to the singular method
                    if (typeof value === 'function') {
                        single.call(this, i, value);
                    }
                    else {
                        // Otherwise pass back to the multiple function
                        multiple.call(this, i, value);
                    }
                }
            }
        }
        else {
            // So evt must be a string
            // And listeners must be an array of listeners
            // Loop over it and pass each one to the multiple method
            i = listeners.length;
            while (i--) {
                single.call(this, evt, listeners[i]);
            }
        }

        return this;
    };

    /**
     * Removes all listeners from a specified event.
     * If you do not specify an event then all listeners will be removed.
     * That means every event will be emptied.
     * You can also pass a regex to remove all events that match it.
     *
     * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeEvent = function removeEvent(evt) {
        var type = typeof evt;
        var events = this._getEvents();
        var key;

        // Remove different things depending on the state of evt
        if (type === 'string') {
            // Remove all listeners for the specified event
            delete events[evt];
        }
        else if (evt instanceof RegExp) {
            // Remove all events matching the regex.
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    delete events[key];
                }
            }
        }
        else {
            // Remove all listeners in all events
            delete this._events;
        }

        return this;
    };

    /**
     * Alias of removeEvent.
     *
     * Added to mirror the node API.
     */
    proto.removeAllListeners = alias('removeEvent');

    /**
     * Emits an event of your choice.
     * When emitted, every listener attached to that event will be executed.
     * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
     * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
     * So they will not arrive within the array on the other side, they will be separate.
     * You can also pass a regular expression to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {Array} [args] Optional array of arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emitEvent = function emitEvent(evt, args) {
        var listeners = this.getListenersAsObject(evt);
        var listener;
        var i;
        var key;
        var response;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                i = listeners[key].length;

                while (i--) {
                    // If the listener returns true then it shall be removed from the event
                    // The function is executed either with a basic call or an apply if there is an args array
                    listener = listeners[key][i];

                    if (listener.once === true) {
                        this.removeListener(evt, listener.listener);
                    }

                    response = listener.listener.apply(this, args || []);

                    if (response === this._getOnceReturnValue()) {
                        this.removeListener(evt, listener.listener);
                    }
                }
            }
        }

        return this;
    };

    /**
     * Alias of emitEvent
     */
    proto.trigger = alias('emitEvent');

    /**
     * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
     * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {...*} Optional additional arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emit = function emit(evt) {
        var args = Array.prototype.slice.call(arguments, 1);
        return this.emitEvent(evt, args);
    };

    /**
     * Sets the current value to check against when executing listeners. If a
     * listeners return value matches the one set here then it will be removed
     * after execution. This value defaults to true.
     *
     * @param {*} value The new value to check for when executing listeners.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.setOnceReturnValue = function setOnceReturnValue(value) {
        this._onceReturnValue = value;
        return this;
    };

    /**
     * Fetches the current value to check against when executing listeners. If
     * the listeners return value matches this one then it should be removed
     * automatically. It will return true by default.
     *
     * @return {*|Boolean} The current value to check for or the default, true.
     * @api private
     */
    proto._getOnceReturnValue = function _getOnceReturnValue() {
        if (this.hasOwnProperty('_onceReturnValue')) {
            return this._onceReturnValue;
        }
        else {
            return true;
        }
    };

    /**
     * Fetches the events object and creates one if required.
     *
     * @return {Object} The events storage object.
     * @api private
     */
    proto._getEvents = function _getEvents() {
        return this._events || (this._events = {});
    };

    /**
     * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
     *
     * @return {Function} Non conflicting EventEmitter class.
     */
    EventEmitter.noConflict = function noConflict() {
        EventEmitter = originalGlobalValue;
        return EventEmitter;
    };

    // Expose the class either via AMD, CommonJS or the global object
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return EventEmitter;
        });
    }
    else if (typeof module === 'object' && module.exports){
        module.exports = EventEmitter;
    }
    else {
        window.EventEmitter = EventEmitter;
    }
}.call(this));
var utils = {}

utils.isObjectOrFunction = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
};

utils.extend = function(obj) {
    if (!utils.isObjectOrFunction(obj)) {
        return obj;
    }
    var source, kl;'//';
    for (var i = 1, length = arguments.length; i < length; i++) {
        source = arguments[i];
        for (var prop in source) {
            obj[prop] = source[prop];
        }
    }
    return obj;
};

utils.inheritMixins = function (target, mixins) {
    if (mixins) {
        mixins.forEach(function (mixin) {
            utils.extend(target.prototype, mixin);
        })
    }
};

utils.EventEmitter = EventEmitter;

utils.isFunction = function(value) {
    return typeof value === 'function';
};

utils.nextTick = function(callback) {
    setTimeout(callback, 0);
};

utils.capitalize = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

utils.lookupCallback = function(store, name, prefix) {
  if (typeof store[name] === 'object') {
    if (!prefix) prefix = 'on';
    return store[name][prefix];
  } else {
    if (!prefix) {
      var prefixedName = 'on' + utils.capitalize(name);
      return store[name] || store[prefixedName];
    } else {
      return store[prefix + utils.capitalize(name)];
    }
  }
};

utils.object = function(keys,vals){
    var o={}, i=0;
    for(;i<keys.length;i++){
        o[keys[i]] = vals[i];
    }
    return o;
};

utils.clone = function (orig) {
    var copy;

    if (null == orig || "object" != typeof orig) {
        return orig;
    }

    if (orig instanceof Date) {
        copy = new Date();
        copy.setTime(orig.getTime());
        return copy;
    }

    if (orig instanceof Array) {
        copy = [];
        for (var i = 0, len = orig.length; i < len; i++) {
            copy[i] = utils.clone(orig[i]);
        }
        return copy;
    }

    if (orig instanceof Object) {
        copy = {};
        for (var key in orig) {
            if (orig.hasOwnProperty(key)) {
                copy[key] = utils.clone(orig[key]);
            }
        }
        return copy;
    }

    throw new Error("Unable to copy!");
}

utils.isArguments = function(value) {
    return value && typeof value == 'object' && typeof value.length == 'number' &&
      (toString.call(value) === '[object Arguments]' || (hasOwnProperty.call(value, 'callee' && !propertyIsEnumerable.call(value, 'callee')))) || false;
};

utils.throwIf = function(val,msg){
    if (val){
        throw Error(msg||val);
    }
};
/**
 * Internal module used to create static and instance join methods
 */

var slice = Array.prototype.slice,
    strategyMethodNames = {
        strict: "joinStrict",
        first: "joinLeading",
        last: "joinTrailing",
        all: "joinConcat"
    };

/**
 * Used in `index.js` to create the static join methods
 * @param {String} strategy Which strategy to use when tracking listenable trigger arguments
 * @returns {Function} A static function which returns a store with a join listen on the given listenables using the given strategy
 */
var staticJoinCreator = function (strategy) {
    return function(/* listenables... */) {
        var listenables = slice.call(arguments);
        return createStore({
            init: function(){
                this[strategyMethodNames[strategy]].apply(this,listenables.concat("triggerAsync"));
            }
        });
    };
};

/**
 * Used in `ListenerMethods.js` to create the instance join methods
 * @param {String} strategy Which strategy to use when tracking listenable trigger arguments
 * @returns {Function} An instance method which sets up a join listen on the given listenables using the given strategy
 */
var instanceJoinCreator = function (strategy) {
    return function(/* listenables..., callback*/) {
        var listenables = slice.call(arguments),
            callback = listenables.pop(),
            numberOfListenables = listenables.length,
            join = {
                numberOfListenables: numberOfListenables,
                callback: this[callback]||callback,
                listener: this,
                strategy: strategy
            };
        for (var i = 0; i < numberOfListenables; i++) {
            this.listenTo(listenables[i],newListener(i,join));
        }
        reset(join);
    };
};

// ---- internal join functions ----

function reset (join) {
    join.listenablesEmitted = new Array(join.numberOfListenables);
    join.args = new Array(join.numberOfListenables);
}

function newListener (i,join) {
    return function() {
        var callargs = slice.call(arguments);
        if (join.listenablesEmitted[i]){
            switch(join.strategy){
                case "strict": throw new Error("Strict join failed because listener triggered twice.");
                case "last": join.args[i] = callargs; break;
                case "all": join.args[i].push(callargs);
            }
        } else {
            join.listenablesEmitted[i] = true;
            join.args[i] = (join.strategy==="all"?[callargs]:callargs);
        }
        emitIfAllListenablesEmitted(join);
    };
}

function emitIfAllListenablesEmitted (join) {
    for (var i = 0; i < join.numberOfListenables; i++) {
        if (!join.listenablesEmitted[i]) {
            return;
        }
    }
    join.callback.apply(join.listener,join.args);
    reset(join);
}
// var _ = require('./utils'),
//     maker = require('./joins').instanceJoinCreator;

/**
 * A module of methods related to listening.
 */
var maker = instanceJoinCreator;

Reflux.ListenerMethods = {

    /**
     * An internal utility function used by `validateListening`
     *
     * @param {Action|Store} listenable The listenable we want to search for
     * @returns {Boolean} The result of a recursive search among `this.subscriptions`
     */
    hasListener: function(listenable) {
        var i = 0,
            listener;
        for (;i < (this.subscriptions||[]).length; ++i) {
            listener = this.subscriptions[i].listenable;
            if (listener === listenable || listener.hasListener && listener.hasListener(listenable)) {
                return true;
            }
        }
        return false;
    },

    /**
     * A convenience method that listens to all listenables in the given object.
     *
     * @param {Object} listenables An object of listenables. Keys will be used as callback method names.
     */
    listenToMany: function(listenables) {
        for(var key in listenables){
            this.listenTo(listenables[key], key, this[key + 'Default'] || key);
        }
    },

    /**
     * Checks if the current context can listen to the supplied listenable
     *
     * @param {Action|Store} listenable An Action or Store that should be
     *  listened to.
     * @returns {String|Undefined} An error message, or undefined if there was no problem.
     */
    validateListening: function(listenable){
        if (listenable === this) {
            return "Listener is not able to listen to itself";
        }
        if (!utils.isFunction(listenable.listen)) {
            return listenable + " is missing a listen method";
        }
        if (listenable.hasListener && listenable.hasListener(this)) {
            return "Listener cannot listen to this listenable because of circular loop";
        }
    },

    /**
     * Sets up a subscription to the given listenable for the context object
     *
     * @param {Action|Store} listenable An Action or Store that should be
     *  listened to.
     * @param {Function|String} callback The callback to register as event handler
     * @param {Function|String} defaultCallback The callback to register as default handler
     * @returns {Object} A subscription obj where `stop` is an unsub function and `listenable` is the object being listened to
     */
    listenTo: function(listenable, callback, defaultCallback) {
        var isPromise = function (target) {
            return typeof Promise !== 'undefined' && typeof target !== 'undefined' && target.constructor === Promise;
        }

        var desub, unsubscriber, catchError, cb, subscriptionobj,
            subs = this.subscriptions = this.subscriptions || [];

        utils.throwIf(this.validateListening(listenable));
        this.fetchDefaultData(listenable, defaultCallback);

        cb = function () {
            if (typeof callback === 'function') return callback.apply(this, arguments);

            var prevResult, isPrevPromise;

            var prevFn = utils.lookupCallback(this, callback, 'will');
            var whileFn = utils.lookupCallback(this, callback, 'while');
            var nextFn = utils.lookupCallback(this, callback, 'did');
            var errorFn = utils.lookupCallback(this, callback, 'didNot');

            if (prevFn) {
                try {
                    prevResult = prevFn.apply(this, arguments);
                } catch (e) {
                    console.error(e);
                    return errorFn ? errorFn.call(this, e) : null;
                }
                isPrevPromise = isPromise(prevResult);
            }

            if (whileFn) {
                whileFn.call(this, true);
            }

            var fn = utils.lookupCallback(this, callback);
            var fnArguments = prevResult && !isPrevPromise ? [prevResult] : arguments;
            var fnResult = prevFn && isPrevPromise ? prevResult.then(fn.bind(this)) :  fn.apply(this, fnArguments);
            var isCurrentPromise = isPromise(fnResult);
            var self = this;

            var nextCb = function (fn) {
                return function () {
                    if (whileFn) whileFn.call(self, false);
                    if (fn) {
                        return fn.apply(self, arguments);
                    }
                }
            };

            if (nextFn) {
                if (isCurrentPromise) {
                    fnResult.then(nextCb(nextFn), nextCb(errorFn));
                } else {
                    nextCb(nextFn).call(this, fnResult);
                }
            } else if (whileFn) {
                whileFn.call(this, false);
            }
        };
        desub = listenable.listen(cb, this);
        unsubscriber = function() {
            var index = subs.indexOf(subscriptionobj);
            utils.throwIf(index === -1,'Tried to remove listen already gone from subscriptions list!');
            subs.splice(index, 1);
            desub();
        };
        subscriptionobj = {
            stop: unsubscriber,
            listenable: listenable
        };
        subs.push(subscriptionobj);
        return subscriptionobj;
    },

    /**
     * Stops listening to a single listenable
     *
     * @param {Action|Store} listenable The action or store we no longer want to listen to
     * @returns {Boolean} True if a subscription was found and removed, otherwise false.
     */
    stopListeningTo: function(listenable){
        var sub, i = 0, subs = this.subscriptions || [];
        for(;i < subs.length; i++){
            sub = subs[i];
            if (sub.listenable === listenable){
                sub.stop();
                utils.throwIf(subs.indexOf(sub)!==-1,'Failed to remove listen from subscriptions list!');
                return true;
            }
        }
        return false;
    },

    /**
     * Stops all subscriptions and empties subscriptions array
     */
    stopListeningToAll: function(){
        var remaining, subs = this.subscriptions || [];
        while((remaining=subs.length)){
            subs[0].stop();
            utils.throwIf(subs.length!==remaining-1,'Failed to remove listen from subscriptions list!');
        }
    },

    /**
     * Used in `listenTo`. Fetches initial data from a publisher if it has a `getDefaultData` method.
     * @param {Action|Store} listenable The publisher we want to get default data from
     * @param {Function|String} defaultCallback The method to receive the data
     */
    fetchDefaultData: function (listenable, defaultCallback) {
        defaultCallback = (defaultCallback && this[defaultCallback]) || defaultCallback;
        var me = this;
        if (utils.isFunction(defaultCallback) && utils.isFunction(listenable.getDefaultData)) {
            data = listenable.getDefaultData();
            if (data && utils.isFunction(data.then)) {
                data.then(function() {
                    defaultCallback.apply(me, arguments);
                });
            } else {
                defaultCallback.call(this, data);
            }
        }
    },

    /**
     * The callback will be called once all listenables have triggered at least once.
     * It will be invoked with the last emission from each listenable.
     * @param {...Publishers} publishers Publishers that should be tracked.
     * @param {Function|String} callback The method to call when all publishers have emitted
     */
    joinTrailing: maker("last"),

    /**
     * The callback will be called once all listenables have triggered at least once.
     * It will be invoked with the first emission from each listenable.
     * @param {...Publishers} publishers Publishers that should be tracked.
     * @param {Function|String} callback The method to call when all publishers have emitted
     */
    joinLeading: maker("first"),

    /**
     * The callback will be called once all listenables have triggered at least once.
     * It will be invoked with all emission from each listenable.
     * @param {...Publishers} publishers Publishers that should be tracked.
     * @param {Function|String} callback The method to call when all publishers have emitted
     */
    joinConcat: maker("all"),

    /**
     * The callback will be called once all listenables have triggered.
     * If a callback triggers twice before that happens, an error is thrown.
     * @param {...Publishers} publishers Publishers that should be tracked.
     * @param {Function|String} callback The method to call when all publishers have emitted
     */
    joinStrict: maker("strict"),
};



/**
 * A module of methods for object that you want to be able to listen to.
 * This module is consumed by `createStore` and `createAction`
 */
Reflux.PublisherMethods = {

    /**
     * Hook used by the publisher that is invoked before emitting
     * and before `shouldEmit`. The arguments are the ones that the action
     * is invoked with. If this function returns something other than
     * undefined, that will be passed on as arguments for shouldEmit and
     * emission.
     */
    preEmit: function() {},

    /**
     * Hook used by the publisher after `preEmit` to determine if the
     * event should be emitted with given arguments. This may be overridden
     * in your application, default implementation always returns true.
     *
     * @returns {Boolean} true if event should be emitted
     */
    shouldEmit: function() { return true; },

    /**
     * Subscribes the given callback for action triggered
     *
     * @param {Function} callback The callback to register as event handler
     * @param {Mixed} [optional] bindContext The context to bind the callback with
     * @returns {Function} Callback that unsubscribes the registered event handler
     */
    listen: function(callback, bindContext) {
        var eventHandler = function(args) {
            callback.apply(bindContext, args);
        }, me = this;
        this.emitter.addListener(this.eventLabel, eventHandler);
        return function() {
            me.emitter.removeListener(me.eventLabel, eventHandler);
        };
    },

    /**
     * Publishes an event using `this.emitter` (if `shouldEmit` agrees)
     */
    trigger: function() {
        var args = arguments,
            pre = this.preEmit.apply(this, args);
        args = pre === undefined ? args : utils.isArguments(pre) ? pre : [].concat(pre);
        if (this.shouldEmit.apply(this, args)) {
            this.emitter.emit(this.eventLabel, args);
        }
    },

    /**
     * Tries to publish the event on the next tick
     */
    triggerAsync: function(){
        var args = arguments,me = this;
        utils.nextTick(function() {
            me.trigger.apply(me, args);
        });
    }
};
// var _ = require('./utils'),
//     Reflux = require('../src'),
//     Keep = require('./Keep'),
//

/**
 * Creates an action functor object. It is mixed in with functions
 * from the `PublisherMethods` mixin. `preEmit` and `shouldEmit` may
 * be overridden in the definition object.
 *
 * @param {Object} definition The action object definition
 */

var allowed = {preEmit:1,shouldEmit:1};

Reflux.createAction = function (definition) {

  definition = definition || {};

  for (var d in definition) {
    if (!allowed[d] && Reflux.PublisherMethods[d]) {
      throw new Error("Cannot override API method " + d +
        " in action creation. Use another method name or override it on Reflux.PublisherMethods instead."
      );
    }
  }

  var context = utils.extend({
      eventLabel: "action",
      emitter: new utils.EventEmitter(),
      _isAction: true
  },Reflux.PublisherMethods,definition);

  var functor = function() {
    functor[functor.sync?"trigger":"triggerAsync"].apply(functor, arguments);
  };

  utils.extend(functor,context);

  Keep.createdActions.push(functor);

  return functor;

};
// var _ = require('./utils'),
//     Reflux = require('../src'),
//     Keep = require('./Keep'),


/**
 * Creates an event emitting Data Store. It is mixed in with functions
 * from the `ListenerMethods` and `PublisherMethods` mixins. `preEmit`
 * and `shouldEmit` may be overridden in the definition object.
 *
 * @param {Object} definition The data store object definition
 * @returns {Store} A data store instance
 */
var allowed = {preEmit:1,shouldEmit:1};

Reflux.createStore = function(definition) {

    var _store = {};
    definition = definition || {};
    var privateMethods = ['set', 'update', 'trigger', 'distribute', 'triggerAsync'];

    for(var d in definition){
        if (!allowed[d] && (Reflux.PublisherMethods[d] || Reflux.ListenerMethods[d])){
            throw new Error("Cannot override API method " + d +
                " in store creation. Use another method name or override it on Reflux.PublisherMethods / Reflux.ListenerMethods instead."
            );
        }
    }

    function Store() {
        var i=0, arr;
        this.subscriptions = [];
        this.emitter = new utils.EventEmitter();
        this.eventLabel = "change";

        if (this.getInitial) {
            var initial = this.getInitial();
            for (var key in initial) {
                _store[key] = initial[key];
            }
        }

        if (Array.isArray(this.privateMethods)) {
            this.privateMethods.forEach(function (method) {
                privateMethods.push(method);
            });
        }

        if (this.init && utils.isFunction(this.init)) {
            this.init();
        }

        if (this.actions){
            if (this.actions.length) {
              this.actions = Exim.createActions(this.actions)
            }

            arr = [].concat(this.actions);
            for(;i < arr.length;i++){
                this.listenToMany(arr[i]);
            }
        }
    }

    Store.prototype.set = function (key, value) {
        if (key.constructor === Object && !value) {
            for (var k in key) {
                _store[k] = key[k];
            }
            return key;
        } else {
            return _store[key] = value;
        }
    };

    Store.prototype.distribute = function () {
        this.trigger(_store);
    };

    Store.prototype.update = function (key, value) {
        this.set(key, value);
        this.distribute();
    };

    Store.prototype.get = function (key) {
        var result = key ? _store[key] : _store;
        return utils.clone(result);
    };

    utils.inheritMixins(Store, definition.mixins);

    utils.extend(Store.prototype, Reflux.ListenerMethods, Reflux.PublisherMethods, definition);

    var store = new Store();

    var storeGetter = {};

    for (var key in store) {
        if (!~privateMethods.indexOf(key)) {
            storeGetter[key] = store[key];
        }
    };

    Keep.createdStores.push(store);

    return storeGetter;
};
var Keep = {};

Keep.createdStores = [];

Keep.createdActions = [];

Keep.reset = function() {
    while(exports.createdStores.length) {
        createdStores.pop();
    }
    while(exports.createdActions.length) {
        createdActions.pop();
    }
};
Reflux.connect = function (listenable, key) {
  var key = arguments.length > 2 ? [].slice.call(arguments, 1) : key;

  var getStateFromArray = function (source, arr) {
    var state = {};
    arr.forEach(function (k) {
      state[k] = source[k];
    })
    return state;
  };

  return {
    getInitialState: function () {
      var initialData;
      if (Array.isArray(key)) {
        initialData = listenable.get()
        var state = getStateFromArray(initialData, key)
        return state
      } else if (!key) {
        return (initialData = listenable.get()) ? initialData : {}
      } else if (typeof key === 'string') {
        initialData = listenable.get();
        var state = {};
        state[key] = initialData[key];
        return state;
      }
    },
    componentDidMount: function() {
      for(var m in Reflux.ListenerMethods) {
        if (this[m] !== Reflux.ListenerMethods[m]){
          if (this[m]) {
            throw "Can't have other property '"+m+"' when using Reflux.listenTo!";
          }
          this[m] = Reflux.ListenerMethods[m];
        }
      }
      var me = this;

      if (key === undefined) {
        var cb = this.setState
      } else {
        var cb = function(v) {
          var state = {};
          if (Array.isArray(key)) {
            key.forEach(function (k) {
              state[k] = v[k]
            });
          } else {
            state[key] = utils.isObjectOrFunction(v) ? v[key] : v;
          }
          me.setState(state);
        }
      }
      this.listenTo(listenable,cb,cb);
    },
    componentWillUnmount: Reflux.ListenerMixin.componentWillUnmount
  };
};

Reflux.onChange = function (listenable, cb) {
  for(var m in Reflux.ListenerMethods) {
    if (this[m] !== Reflux.ListenerMethods[m]){
      if (this[m]) {
        throw "Can't have other property '"+m+"' when using Reflux.listenTo!";
      }
      this[m] = Reflux.ListenerMethods[m];
    }
  }

  callback = function () {
    cb(listenable.get());
  }

  listenable.listen(callback)
};

// Reflux.watch = function (listenable, keys) {

// };
// var _ = require('./utils'),
//     ListenerMethods = require('./ListenerMethods');

/**
 * A module meant to be consumed as a mixin by a React component. Supplies the methods from
 * `ListenerMethods` mixin and takes care of teardown of subscriptions.
 */
Reflux.ListenerMixin = utils.extend({

    /**
     * Cleans up all listener previously registered.
     */
    componentWillUnmount: Reflux.ListenerMethods.stopListeningToAll

}, Reflux.ListenerMethods);
// var Reflux = require('../src');


/**
 * A mixin factory for a React component. Meant as a more convenient way of using the `ListenerMixin`,
 * without having to manually set listeners in the `componentDidMount` method.
 *
 * @param {Action|Store} listenable An Action or Store that should be
 *  listened to.
 * @param {Function|String} callback The callback to register as event handler
 * @param {Function|String} defaultCallback The callback to register as default handler
 * @returns {Object} An object to be used as a mixin, which sets up the listener for the given listenable.
 */
Reflux.listenTo = function(listenable,callback,initial){
    return {
        /**
         * Set up the mixin before the initial rendering occurs. Import methods from `ListenerMethods`
         * and then make the call to `listenTo` with the arguments provided to the factory function
         */
        componentDidMount: function() {
            for(var m in Reflux.ListenerMethods){
                if (this[m] !== Reflux.ListenerMethods[m]){
                    if (this[m]){
                        throw "Can't have other property '"+m+"' when using Reflux.listenTo!";
                    }
                    this[m] = Reflux.ListenerMethods[m];
                }
            }
            this.listenTo(listenable,callback,initial);
        },
        /**
         * Cleans up all listener previously registered.
         */
        componentWillUnmount: Reflux.ListenerMethods.stopListeningToAll
    };
};
// var Reflux = require('../src');

/**
 * A mixin factory for a React component. Meant as a more convenient way of using the `listenerMixin`,
 * without having to manually set listeners in the `componentDidMount` method. This version is used
 * to automatically set up a `listenToMany` call.
 *
 * @param {Object} listenables An object of listenables
 * @returns {Object} An object to be used as a mixin, which sets up the listeners for the given listenables.
 */
Reflux.listenToMany = function(listenables){
    return {
        /**
         * Set up the mixin before the initial rendering occurs. Import methods from `ListenerMethods`
         * and then make the call to `listenTo` with the arguments provided to the factory function
         */
        componentDidMount: function() {
            for(var m in Reflux.ListenerMethods){
                if (this[m] !== Reflux.ListenerMethods[m]){
                    if (this[m]){
                        throw "Can't have other property '"+m+"' when using Reflux.listenToMany!";
                    }
                    this[m] = Reflux.ListenerMethods[m];
                }
            }
            this.listenToMany(listenables);
        },
        /**
         * Cleans up all listener previously registered.
         */
        componentWillUnmount: Reflux.ListenerMethods.stopListeningToAll
    };
};


/**
 * Convenience function for creating a set of actions
 *
 * @param actionNames the names for the actions to be created
 * @returns an object with actions of corresponding action names
 */

var maker = staticJoinCreator;

Reflux.joinTrailing = Reflux.all = maker('last');

Reflux.joinLeading = maker('first');

Reflux.joinStrict = maker('strict');

Reflux.joinConcat = maker('all');



Reflux.createActions = function(actionNames) {
    var i = 0, actions = {};
    for (; i < actionNames.length; i++) {
        actions[actionNames[i]] = Reflux.createAction();
    }
    return actions;
};

/**
 * Sets the eventmitter that Reflux uses
 */
Reflux.setEventEmitter = function(ctx) {
    var _ = require('./utils');
    _.EventEmitter = ctx;
};

/**
 * Sets the method used for deferring actions and stores
 */
Reflux.nextTick = function(nextTick) {
    var _ = require('./utils');
    _.nextTick = nextTick;
};

/**
 * Provides the set of created actions and stores for introspection
 */
Reflux.__keep = Keep;
var Exim = Reflux;

Exim.cx = function (classNames) {
  if (typeof classNames == 'object') {
    return Object.keys(classNames).filter(function(className) {
      return classNames[className];
    }).join(' ');
  } else {
    return Array.prototype.join.call(arguments, ' ');
  }
};

if (typeof React !== 'undefined') {
  var domHelpers = {};

  var tag = function (name) {
    var args, attributes, name;
    args = [].slice.call(arguments, 1);
    var first = args[0] && args[0].constructor;
    if (first === Object) {
      attributes = args.shift();
    } else {
      attributes = {};
    }
    return React.DOM[name].apply(React.DOM, [attributes].concat(args))
  };

  var bindTag = function(tagName) {
    return domHelpers[tagName] = tag.bind(this, tagName);
  };

  for (var tagName in React.DOM) {
    bindTag(tagName);
  }

  domHelpers['space'] = function() {
    return React.DOM.span({
      dangerouslySetInnerHTML: {
        __html: '&nbsp;'
      }
    });
  };

  Exim.DOM = domHelpers;

  Exim.addTag = function (name, tag) {
    this.DOM[name] = tag;
  }
}

  var toS = Object.prototype.toString;

  if (typeof ReactRouter === "object") {
    Exim.Router = {
      match: function(name, View) {
        var options = {};

        var routes = [].slice.call(arguments, 2);
        if (typeof name !== 'string') {
          routes = [View].concat(routes);
          View = name;
          name = null;
        }

        var firstRouteIsOptions = !(routes[0] && 'props' in routes[0]);
        if (routes[0] && firstRouteIsOptions) {
          options = routes[0];
          routes = routes.slice(1);
        }

        var opts = {handler: View};
        if (name) opts.name = name;
        if (options.path) opts.path = options.path;
        var args = [opts].concat(routes);

        return ReactRouter.Route.apply(ReactRouter.Route, args);
      },
      startRouting: function(routes, element) {
        return ReactRouter.run(routes, ReactRouter.HistoryLocation, function(Handler) {
          React.render(React.createElement(Handler, null), element)
        });
      },
      defaultTo: function(View) {
        return ReactRouter.DefaultRoute({handler: View});
      }
    };


    ['Link', 'transitionTo', 'goBack', 'replaceWith', 'Route', 'RouteHandler', 'State', 'Link'].forEach(function(name) {
      Exim.Router[name] = ReactRouter[name]
    });
  }

  Exim.createAction = Reflux.createAction;
  Exim.createActions = Reflux.createActions;
  Exim.createStore = Reflux.createStore;

  return Exim;
});
