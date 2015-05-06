import Class from './Class'
import Action from './Action'
import config from './Config'

require("babelify/polyfill")

export class Store extends Class {
  constructor(args) {
    var {actions} = args;
    var runners = {};
    if (Array.isArray(actions))
      var actionsToSave = actions.map((action, i, acts) => {
        var instance = new Action({action, store: this})
        runners[action] = instance.run.bind(instance)
        return instance
      });

      Object.keys(runners).forEach( (key) =>
        actionsToSave[key] = runners[key]
      )
      this.actions = actionsToSave;
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

  runCycle() {
    console.log('Run cycle');
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
