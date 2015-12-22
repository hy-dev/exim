let globalStore, stores;

export default class GlobalStore {
  static getStore() {
    if (!globalStore) {
      globalStore = {};
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
        values[bit] = (typeof init !== undefined && bits.length - 1 === i) ? init : {};
        values = values[bit];
      }
    });
    return values;
  }

  static init(path, init, store) {
    if (stores == null) stores = {};
    stores[path] = store;
    return this.getSubstore(path, init);
  }

  static get(substore, name) {
    let values = this.getSubstore(substore);
    if (!name) return values;
    return values ? values[name] : {};
  }

  static remove(substore, key) {
    const values = this.getSubstore(substore);

    let success = false;
    if (!key) {
      success = values[key] && delete values[key];
    } else {
      for (let key in values) {
        success = values[key] && delete values[key];
      }
    }
    return success;
  }

  static set(substore, name, value) {
    let values = this.getSubstore(substore);
    if (values) values[name] = value;
    return value;
  }

  static findStore(path) {
    return stores[path];
  }
}
