import Class from './Class'

export default class Action extends Class {
  constructor(args) {
    var [store, stores, allStores] = [args.store, args.stores, []]
    this.name = args.name;

    if (store)
      allStores.push(store);
    if (stores)
      allStores.push.apply(allStores, stores);

    this.stores = allStores;
  }

  run(...args) {
    this.stores.forEach(store =>
      store.runCycle(this.name, args)
    )
  }

  setStore(store) {
    this.stores.push(store)
  }
}

