import {Actions} from './Actions'
import connect from './mixins/connect'
import Getter from './Getter'
import utils from './utils'

export default class Store {
  constructor(args={}) {
    let {actions, initial} = args;
    initial = typeof initial === 'function' ? initial() : initial;
    const store = initial || {};

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
      return (correctArgs) ? store[key] = value : false;
    }

    const getValue = function (key) {
      return key ? store[key] : store;
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
           } else if (type === 'sting') {
            result[key] = getValue(key)[val]
          }
        }
        return result;
      }
    }

    this.set = set;
    this.get = get;

    this.stateProto = {set, get, actions};

    return this.getter = new Getter(this);
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
    if (will) promise = promise.then(() => {
      // console.log(actionName, 'will');
      return will.apply(state, args)
    });

    // Start while()..
    if (while_) promise.then(() => {
      // console.log(actionName, 'while', true);
      return while_.apply(state, [true].concat(args));
    });

    // Actual execution.
    promise = promise.then((willResult) => {
      // console.log(actionName, 'on');
      if (willResult == null) {
        return on_.apply(state, args)
      } else {
        return on_.call(state, willResult);
      }
    });

    // Stop while().
    if (while_) promise.then(() => {
      // console.log(actionName, 'while', false);
      return while_.apply(state, [false].concat(args));
    });

    // Handle the result.
    if (did) promise = promise.then(onResult => {
      // console.log(actionName, 'did');
      return did.call(state, onResult)
    });
    if (didNot) {
      promise.catch(error => {
      // console.log(actionName, 'didNot');
      return didNot.call(state, error);
      });
    } else {
      promise.catch(error => {
        // TODO: Handle error
        throw error;
      })
    }
    promise.then(() => {
      Object.freeze(state);
    });

  }
}
