import Emitter from './Emitter'
import config from './config'
import getConnectMixin from './mixins/connect'

export default class Getter extends Emitter {
  constructor(store) {
    super();
    // this[__store] = store;
    for (let key in store) {
      let commonPrivate = config.privateMethods;
      let itemPrivate = store.privateMethods;
      if (!commonPrivate.has(key) && !(itemPrivate && itemPrivate.has(key))) this[key] = store[key];
    }

    this.connect = function (...args) {
      return getConnectMixin.apply(null, [this].concat(args));
    }
  }
}
