import Class from './Class'

export class Action extends Class {
  constructor(args) {
    var [store, stores, allStores] = [args.store, args.stores, []];
    this.name = args.name;

    if (store)
      allStores.push(store);
    if (stores)
      allStores.push.apply(allStores, stores);

    this.stores = allStores;
  }

  run(...args) {
    var storesCycles = this.stores.map( store =>
      return store.runCycle.apply(store, [this.name]concat(args));
    )
    return Promise.all(storeCycles)
  }

  setStore(store) {
    this.stores.push(store)
  }
}


export class Actions extends Class {
  constructor(actions) {
    if (Array.isArray(actions))
      actions.forEach( action => {
        this.addAction(action);
      });
  }

  addAction(item, noOverride) {
    var old;
    action = this.detectAction(item);
    if (noOverride)
      action = false
    else
      if (old = this[action.name])
        this.removeAction(old)
      this[action.name] = action.run.bind(instance);

    return action;
  }

  removeAction(item) {
    action = this.detectAction(item, true);
    delete this[action.name];
  }

  detectAction(action, isOld, store=this) {
    if (action.constructor === Action)
      return action;
    else if (typeof action === 'string')
      if (isOld)
        return this[action];
      else
        return new Action({name: action, store});
  }
}
