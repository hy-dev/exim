import {Actions} from './Actions'
import connect from './mixins/connect'
import Getter from './Getter'
import utils from './utils'

// const __store = Symbol('store');
// const __store = 'store'

export default class Store {
  constructor(args) {
    if (!args) args = {};
    const {actions, initial} = args;
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
      this.actions = new Actions(actions);
      this.actions.addStore(this);
    }

    let setValue = function (key, value) {
      let correctArgs = ['key', 'value'].every(item => typeof item === 'string');
      let result = (correctArgs) ? store[key] = value : false;
      if (result) this.emit();
    }

    let getValue = function (key) {
      return key ? store[key]: store;
    }

    this.set = function (item, value, options) {
      if (utils.isObject(item)) {
        if (!value) value = options;
        for (let key in item) {
          setValue(key, item[key]);
        }
      }
      else {
        setValue(item, value);
      }
    }

    this.get = function (item) {
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

    // this.reset = function () {
    //   store = initial || {};
    // }

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

    if (cycle.will) promise = promise.then(() => cycle.will.apply(cycle, args));
    if (cycle.while) promise.then(() => cycle.while.apply(cycle, [true].concat(args)));
    promise = promise.then((willResult) => {
      if (willResult == null) {
        return cycle.on.apply(cycle, args)
      } else {
        return cycle.on(willResult);
      }
    });
    if (cycle.while) promise.then(() => cycle.while.apply(cycle, [false].concat(args)));
    if (cycle.did) promise = promise.then(onResult => cycle.did(onResult));
    if (cycle.didNot) promise.catch(error => cycle.didNot(error));
    return promise;
  }
}
