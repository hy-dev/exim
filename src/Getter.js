import Emitter from './Emitter'
import config from './config'
import getConnectMixin from './mixins/connect'

export default class Getter extends Emitter {
  constructor(store) {
    super();

    // Copy allowed props to getter.
    config.allowedGetterProps.forEach(prop => this[prop] = store[prop]);

    // Consistent names for emitter methods.
    [this.onChange, this.offChange] = [this._addListener, this._removeListener];

    // Connect mixin binded to getter.
    this.connect = function (...args) {
      return getConnectMixin.apply(null, [this].concat(args));
    }
  }
}
