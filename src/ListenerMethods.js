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
        if (!Promise) {
            Promise = {
                is: function () {
                    return false;
                }
            }
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
                isPrevPromise = Promise.is(prevResult);
            }

            if (whileFn) {
                whileFn.call(this, true);
            }

            var fn = utils.lookupCallback(this, callback);
            var fnArguments = prevResult && !isPrevPromise ? [prevResult] : arguments;
            var fnResult = prevFn && isPrevPromise ? prevResult.then(fn.bind(this)) :  fn.apply(this, fnArguments);
            var isPromise = Promise.is(fnResult);
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
                if (isPromise) {
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

