export default class {
  constructor() {
    this._listeners = [];
  }

  findListenerIndex(listener) {
    return this._listeners.indexOf(listener) >= 0
  }

  addListener(listener) {
    let found = this.findListenerIndex(listener);
    console.log(found);
    if (!found) {
      this._listeners.push(listener);
    }
    return this;
  }

  removeListener() {
    let index, found = (index = this.findListener(listener)) >= 0;
    if (found) {
      this._listeners.splice(index, 1);
    }
    return this;
  }

  emit() {
    this._listeners.forEach(listener => listener())
  }
}
