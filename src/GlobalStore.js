var globalStore, stores;

export default class GlobalStore {
  static getStore() {
    if (!globalStore) {
      globalStore = new Object();
    }
    return globalStore;
  }

  static getSubstore(path, init) {
    let store = this.getStore();
    let pathBits = path.split('/');
    let values = store;
    pathBits.forEach(function(bit, i, bits) {
      if (values[bit]) {
        values = values[bit];
      } else {
        values[bit] = (typeof init !== undefined && bits.length - 1 === i) ? init : new Object();
        values = values[bit];
      }
    });
    return values;
  }

  static init(path, init, store) {
    if(typeof stores === 'undefined')
      stores = new Object();
    stores[path] = store;
    return this.getSubstore(path, init);
  }

  static get(substore, name) {
    let values = this.getSubstore(substore);
    if (!name)
      values;
    return values ? values[name] : new Object();
  }

  static remove(substore, key) {
    let values = this.getSubstore(substore);

    let success = false;
    if (!key) {
      for (let key in values) {
        success = values[key] && delete values[key];
      }
    } else {
     success = values[key] && delete values[key];
    }
    return success;
  }

  static set(substore, name, value) {
    let values = this.getSubstore(substore);

    if (values)
      values[name] = value;

    return this.get(substore);
  }

  static findStore(path) {
    return stores[path];
  }
}
