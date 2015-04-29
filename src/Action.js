import Class from './Class'

export default class Action extends Class {
  constructor(args) {
    var name = args.name;
    var store = args.store;
    this.name = name;
    this.stores = [];
    // if (store)
      // this.setStore(store)
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

