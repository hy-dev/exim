import {Actions} from './Actions'
import connect from './mixins/connect'
import Getter from './Getter'
import utils from './utils'
import GlobalStore from './GlobalStore'

export default class Store {
  constructor(args={}) {
    let {path, actions, initial} = args;
    if (typeof path === 'undefined' || path === null) path = `nopath/${utils.generateId()}`;
    this.initial = initial = typeof initial === 'function' ? initial() : initial;
    this.path = path;
    GlobalStore.init(path, initial, this);

    let stateUpdates = new Object();

    let privateMethods;
    if (!args.privateMethods) {
      privateMethods = new Set()
    } else if (Array.isArray(args.privateMethods)) {
      privateMethods = new Set();
      args.privateMethods.forEach(m => privateSet.add(m));
      args.privateMethods = privateSet;
    } else if (args.privateMethods.constructor === Set) {
      privateMethods = args.privateMethods;
    }
    this.privateMethods = privateMethods;

    this.handlers = args.handlers || utils.getWithoutFields(['actions'], args) || {};

    if (Array.isArray(actions)) {
      this.actions = actions = new Actions(actions);
      this.actions.addStore(this);
    }

    let _this = this;

    const setValue = function (key, value) {
      const correctArgs = ['key', 'value'].every(item => typeof item === 'string');
      return (correctArgs) ? GlobalStore.set(path, key, value) : false;
    }

    const getValue = function (key, preserved) {
      if(preserved && key in stateUpdates)
        return stateUpdates[key]
      return GlobalStore.get(path, key);
    }

    const getPreservedValue = function (key) {
      return getValue(key, true);
    }

    const removeValue = function (key) {
      return GlobalStore.remove(path, key);
    }

    const set = function (item, value, options={}) {
      if (utils.isObject(item)) {
        if (utils.isObject(value)) options = value;
        for (let key in item) {
          setValue(key, item[key], options);
        }
      } else {
        setValue(item, value, options);
      }
      if (!options.silent) {
        _this.getter.emit();
      }
    }

    const get = function (item) {
      if (typeof item === 'string' || typeof item === 'number') {
        return getValue(item);
      } else if (Array.isArray(item)) {
        return item.map(key => getValue(key))
      } else if (!item) {
        return getValue();
      } else if (typeof item === 'object') {
        let result = {};
        for (let key in item) {
          let val = item[key];
          let type = typeof val;
          if (type === 'function') {
            result[key] = item[key](getValue(key));
           } else if (type === 'string') {
            result[key] = getValue(key)[val];
          }
        }
        return result;
      }
    }

    const reset = function (item, options={}) {
      if (item) {
        setValue(item, initial[item]);
      } else {
        removeValue(item);
      }
      if (!options.silent) {
        _this.getter.emit();
      }
    }

    const preserve = function(arg1, arg2) {
      if(typeof arg2 !== 'undefined'){
        stateUpdates[arg1] = arg2;
      } else {
        Object.keys(arg1).forEach(function(key) {
          stateUpdates[key] = arg1[key];
        });
      }
    }

    const getPreserved = function(item) {
      if (typeof item === 'string' || typeof item === 'number') {
        return getPreservedValue(item);
      } else if (Array.isArray(item)) {
        return item.map(key => getPreservedValue(key))
      } else if (!item) {
        return getPreservedValue();
      } else if (typeof item === 'object') {
        let result = {};
        for (let key in item) {
          let val = item[key];
          let type = typeof val;
          if (type === 'function') {
            result[key] = item[key](getPreservedValue(key));
           } else if (type === 'string') {
            result[key] = getPreservedValue(key)[val];
          }
        }
        return result;
      }
    }

    const getPreservedState = function() {
      var newState = new Object(stateUpdates);
      stateUpdates = new Object();
      return newState;
    }

    this.set = set;
    this.get = get;
    this.reset = reset;

    this.stateProto = {set, get, reset, actions};
    this.preserverProto = {set: preserve, get: getPreserved, reset, actions, getPreservedState};

    return this.getter = new Getter(this);
  }

  addAction(item) {
    if (Array.isArray(item)) {
      this.actions = this.actions.concat(actions);
    } else if (typeof item === 'object') {
      this.actions.push(item);
    }
  }

  removeAction(item) {
    var action;
    if (typeof item === 'string') {
      action = this.findByName('actions', 'name', item);
      if (action) action.removeStore(this);
    } else if (typeof item === 'object') {
      action = item;
      index = this.actions.indexOf(action);
      if (index !== -1) {
        action.removeStore(this);
        this.actions = this.actions.splice(index, 1);
      }
    }
  }

  getActionCycle(actionName, prefix='on') {
    const capitalized = utils.capitalize(actionName);
    const fullActionName = `${prefix}${capitalized}`;
    const handler = this.handlers[fullActionName] || this.handlers[actionName];
    if (!handler) {
      throw new Error(`No handlers for ${actionName} action defined in current store`);
    }
    let actions;
    // if (Array.isArray(handler)) {
    //   actions = handlers;
    // } else
    if (typeof handler === 'object') {
      // actions = utils.mapActionNames(handler);
      actions = handler;
    } else if (typeof handler === 'function') {
      actions = {on: handler};
    } else {
      throw new Error(`${handler} must be an object or function`);
    }
    return actions;
  }

  // 1. will(initial) => willResult
  // 2. while(true)
  // 3. on(willResult || initial) => onResult
  // 4. while(false)
  // 5. did(onResult)
  runCycle(actionName, ...args) {
    // new Promise(resolve => resolve(true))
    const cycle = this.getActionCycle(actionName);
    let promise = Promise.resolve();
    let will = cycle.will, while_ = cycle.while, on_ = cycle.on;
    let did = cycle.did, didNot = cycle.didNot;

    // Local state for this cycle.
    let state = Object.create(this.stateProto);
    let preserver =  Object.create(this.preserverProto);

    // Pre-check & preparations.

    var transaction = function(body) {
      var result = body();
      
      if (typeof result !== 'undefined' && typeof result.then == 'function') {
        result.then((res) => {
          let preservedState = preserver.getPreservedState();
          let stateChanged = Object.keys(preservedState).length;
          if (stateChanged) {
            state.set(preservedState);
          }
          return Promise.resolve(res);
        });
      } else {
        let preservedState = preserver.getPreservedState();
        let stateChanged = Object.keys(preservedState).length;
        if (stateChanged) {
          state.set(preservedState);
        }
      }
      return result;
    };

    if (will) promise = promise.then(() => {
      return transaction(function() {
        return will.apply(preserver, args);
      })
    });

    // Actual execution.
    promise = promise.then(function (willResult) {
      return transaction(function() {
        if (while_) {
          while_.call(preserver, true);
        }
        if (willResult == null) {
          return on_.apply(preserver, args);
        } else {
          return on_.call(preserver, willResult);
        }
      });
    });

    // For did and didNot state is freezed.
    promise = promise.then((onResult) => {
      Object.freeze(state);
      return onResult;
    });

    // Handle the result.
    if (did) promise = promise.then(onResult => {
      return transaction(function() {
        if (while_)
          while_.call(preserver, false);
        return did.call(preserver, onResult);
      });
    });

    if (typeof did === 'undefined' && while_) promise = promise.then(onResult => {
      return transaction(function() {
        return while_.call(preserver, false);
      })
    });

    promise.catch(error => {
      return transaction(function() {
        if (while_) while_.call(preserver, false);
        if (didNot) {
          didNot.call(preserver, error);
        } else {
          throw error;
        }
      })
    });

    return promise;
  }
}
