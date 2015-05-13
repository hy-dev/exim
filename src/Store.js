import Emitter from './Emitter'
import {Action, Actions} from './Action'
import connect from './mixins/connect'
import config from './Config'
import utils from './utils'

// const __store = Symbol('store');
// const __store = 'store'

export class Store {
  constructor(args) {
    if (!args) args = {};
    const {actions, initial} = args;
    const store = initial || {};
    this.handlers = args.handlers || utils.getWithoutFields(['actions'], args) || {};
    if (Array.isArray(actions)) {
      this.actions = new Actions(actions);
      this.actions.addStore(this);
    }

    const setValue = function (key, value) {
      const correctArgs = ['key', 'value'].every(item => typeof item === 'string');
      return correctArgs ? store[key] = value : false;
    }

    const getValue = function (key) {
      return key ? store[key]: store;
    }

    const set = function (item, value, options) {
      if (utils.isObject(item)) {
        if (!value) value = options;
        for (let key in item) {
          setValue(key, item[key]);
        }
      } else {
        setValue(item, value);
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
          if (typeof item[key] === 'function') {
            result[key] = item[key](getValue(key));
           } else if (typeof item[key] === 'sting') {
            result[key] = getValue(key)[item[key]]
          }
        }
        return result;
      }
    }

    this.stateProto = {get, set};
  }

  addAction(item) {
    if (Array.isArray(item)) {
      this.actions = this.actions.concat(actions)
    } else if (typeof item === 'object') {
      this.actions.push(item)
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
    const fullActionName = `${prefix}${capitalized}`
    console.log(fullActionName);
    const handler = this.handlers[fullActionName] || this.handlers[actionName];
    if (!handler) {
      throw new Error(`No handlers for ${actionName} action defined in current store`)
    }
    let actions;
    // if (Array.isArray(handler)) {
    //   actions = handlers;
    // } else
    if (typeof handler === 'object') {
      // actions = utils.mapActionNames(handler);
      actions = handler;
    } else if (typeof handler === 'function') {
      actions = {on: handler}
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

    // Pre-check & preparations.
    if (will) promise = promise.then(() => will.apply(state, args));

    // Start while()..
    if (while_) promise.then(() => while_.apply(state, [true].concat(args)));

    // Actual execution.
    promise = promise.then((willResult) => {
      if (willResult == null) {
        return on_.apply(state, args)
      } else {
        return on_.call(state, willResult);
      }
    });
    // Stop while().
    if (while_) promise.then(() => while_.apply(state, [false].concat(args)));

    // Handle the result.
    if (did) promise = promise.then(onResult => did.call(state, onResult));
    if (didNot) promise.catch(error => didNot.call(state, error));
    promise.then(() => {
      Object.freeze(state);
    });

  }
}

export class Getter extends Emitter {
  constructor(store) {
    // this[__store] = store;
    for (let key in store) {
      let commonPrivate = config.privateMethods;
      let itemPrivate = store.privateMethods;
      if (!commonPrivate.has(key) && !(itemPrivate && itemPrivate.has(key))) this[key] = store[key];
    }
  }

}
