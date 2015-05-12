import Class from './Class'

export class Action extends Class {
  constructor(args) {
    const [store, stores, allStores] = [args.store, args.stores, []];
    this.name = args.name;

    if (store)
      allStores.push(store);
    if (stores)
      allStores.push.apply(allStores, stores);

    this.stores = allStores;
  }

  run(...args) {
    const storesCycles = this.stores.map( store =>
      store.runCycle.apply(store, [this.name].concat(args))
    )
    return Promise.all(storesCycles)
  }

  addStore(store) {
    this.stores.push(store)
  }
}

export class Actions extends Class {
  constructor(actions) {
    this.all = [];
    if (Array.isArray(actions))
      actions.forEach( action => {
        this.addAction(action);
      });
    // return this.getter = {};
  }

  addAction(item, noOverride) {
    var old;
    var action = this.detectAction(item);
    if (noOverride)
      action = false
    else
      if (old = this[action.name])
        this.removeAction(old)
      this.all.push(action);
      this[action.name] = action.run.bind(action);

    return action;
  }

  removeAction(item) {
    action = this.detectAction(item, true);
    index = this.all.indexOf(action)
    if (~index)
      this.all(splice(index,1))
    delete this[action.name];
  }

  addStore(store) {
    this.all.forEach(action =>
      action.addStore(store)
    )
  }

  detectAction(action, isOld) {
    if (action.constructor === Action)
      return action;
    else if (typeof action === 'string')
      if (isOld)
        return this[action];
      else
        return new Action({name: action});
  }
}
