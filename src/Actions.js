import Class from './Class'

export class Action {
  constructor(args) {
    const [store, stores, allStores] = [args.store, args.stores, []];
    this.name = args.name;

    if (store) allStores.push(store);
    if (stores) allStores.push.apply(allStores, stores);

    this.stores = allStores;
  }

  run(...args) {
    const storesCycles = this.stores.map(store =>
      store.runCycle.apply(store, [this.name].concat(args))
    )
    return Promise.all(storesCycles);
  }

  addStore(store) {
    this.stores.push(store);
  }
}

export class Actions {
  constructor(actions) {
    this.all = [];
    if (Array.isArray(actions)) {
      actions.forEach((action => this.addAction(action)), this);
    }
    // return this.getter = {};
  }

  addAction(item, noOverride) {
    const action = noOverride ? false : this.detectAction(item);
    if (!noOverride) {
      let old;
      if (old = this[action.name]) this.removeAction(old);
      this.all.push(action);
      this[action.name] = action.run.bind(action);
    }

    return action;
  }

  removeAction(item) {
    const action = this.detectAction(item, true);
    const index = this.all.indexOf(action);
    if (index !== -1) this.all(splice(index, 1));
    delete this[action.name];
  }

  addStore(store) {
    this.all.forEach(action => action.addStore(store));
  }

  detectAction(action, isOld) {
    if (action.constructor === Action) {
      return action;
    } else if (typeof action === 'string') {
      return (isOld) ? this[action] : new Action({name: action});
    }
  }
}
