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
            var initial = this.getInitial()
            for (key of initial) {
                _store[key] = initial[key];
            }
        }

        if (this.init && utils.isFunction(this.init)) {
            this.init();
        }

        if (this.listenables){
            arr = [].concat(this.listenables);
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

    Store.prototype.get = function (key) {
        return key ? _store[key] : _store;
    };

    Store.prototype.distribute = function () {
        this.trigger(_store);
    };

    Store.prototype.update = function (key, value) {
        this.set(key, value);
        this.distribute();
    };

    utils.extend(Store.prototype, Reflux.ListenerMethods, Reflux.PublisherMethods, definition);

    var store = new Store();
    Keep.createdStores.push(store);

    return store;
};
