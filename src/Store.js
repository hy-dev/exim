import Class from './Class'
import {Action, Actions} from './Action'
import config from './Config'
import utils from './utils'

require("babelify/polyfill")

export class Store extends Class {
  constructor(args) {
    const {actions} = args;
    this.handlers = args.handlers || utils.getWithoutFields(['actions'], args) || {};
    if (Array.isArray(actions))
      this.actions = new Actions(actions);
      this.actions.addStore(this);
  }

  addAction(item) {
    if (Array.isArray(item))
      this.actions.concat(actions)
    else if (typeof item === 'object')
      this.actions.push(item)
  }

  removeAction(item) {
    var action;
    if (typeof item === 'string')
      action = this.findByName('actions', 'name', item)
      if (action)
        action.removeStore(this)
    else if (typeof item === 'object')
      action = item
      index = this.actions.indexOf(action)
      if (~index)
        action.removeStore(this)
        this.actions = this.actions.splice(index, 1)
  }

  getActionCycle(actionName, prefix='on') {
    const capitalized = utils.capitalize(actionName);
    const fullActionName = `${prefix}${capitalized}`
    console.log(fullActionName);
    const handler = this.handlers[fullActionName] || this.handlers[actionName];
    var actions;
    if (!handler)
      throw new Error(`No handlers for ${actionName} action defined in current store`)
    else if (Array.isArray(handler))
      actions = handlers;
    else if (typeof handler === 'object')
      actions = utils.objectToArray(handler);
    else if (typeof handler === 'function')
      actions = [handler];
    else
      throw new Error(`${handler} is not array, object or function`);
    return actions;
  }

  runCycle(actionName, ...args) {
    // new Promise(resolve => resolve(true))
    const cycle = this.getActionCycle(actionName);
    const chain = cycle.map(fn => fn.apply(this, args)); //TODO: Make promise chain, that args to next chain item and have common cycle value
    return Promise.all(chain);
  }
}

export class Getter extends Class {
  constructor(store) {
    var _store = Symbol('store');
    this[_store] = store;
    for (let key in store) {
      let privateMethods = config.privateMethods.concat(store.privateMethods);
      if (!privateMethods.includes(key)) {
        this[key] = store[key];
      }
    }
  }
}
