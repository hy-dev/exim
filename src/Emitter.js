export default class {
  constructor() {
    this._listeners = [];
  }

  findListenerIndex(listener) {
    return this._listeners.indexOf(listener)
  }

  _addListener(listener, context) {
    let found = this.findListenerIndex(listener) >= 0;
    if (!found) {
      if (context) listener._ctx = context;
      this._listeners.push(listener);
    }
    return this;
  }

  _removeListener(listener) {
    let index, found = (index = this.findListenerIndex(listener)) >= 0;
    if (found) {
      this._listeners.splice(index, 1);
    }
    return this;
  }

  emit() {
    this._listeners.forEach(listener => listener._ctx ? listener.call(listener._ctx) : listener());
  }
}
