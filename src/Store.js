import Class from './Class'
import Action from './Action'

export default class Store extends Class {
  constructor(args) {
    var {actions} = args;
    var runners = {};
    if (Array.isArray(actions))
      var actionsToSave = actions.map((action, i, acts) => {
        var instance = new Action({action, store: this})
        runners[action] = instance.run
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
}
