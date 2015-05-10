import Class from './Class'
import {Action, Actions} from './Action'
import config from './Config'
import utils from './utils'

require("babelify/polyfill")

export class Store extends Class {
  constructor(args) {
    var {actions} = args;
    var handlers = utils.getWithout('actions', args);
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

  // getActionCycle(actionName) {
  //   if (typeof this[name] === 'object') {
  //     if (!prefix) prefix = 'on';
  //     return store[name][prefix];
  //   } else {
  //     if (!prefix) {
  //       var prefixedName = 'on' + utils.capitalize(name);
  //       return store[name] || store[prefixedName];
  //     } else {
  //       return store[prefix + utils.capitalize(name)];
  //     }
  //   }
  // }

  runCycle(actionName, ...args) {
    console.log('Run cycle');
    // cycle = this.getActionCycle(actionName)
    // Promise.all(cycle)
  }
}

export class Getter extends Class {
  constructor(store) {
    let _store = Symbol('store');
    this[_store] = store;
    for (var key in store) {
      let privateMethods = config.privateMethods.concat(store.privateMethods);
      if (!privateMethods.includes(key)) {
        this[key] = store[key];
      }
    }
  }
}
