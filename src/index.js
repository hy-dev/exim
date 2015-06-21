import {Action, Actions} from './Actions'
import Store from './Store'
import helpers from './helpers'
import {createView, Router, DOM} from './DOMHelpers'

const Exim = {Action, Actions, Store, Router, DOM, helpers, createView}

Exim.createAction = function (args) {
  return new Action(args);
}

Exim.createActions = function (args) {
  return new Actions(args);
}

Exim.createStore = function (args) {
  return new Store(args);
}

const root = typeof self === 'object' && self.self === self && self || typeof global === 'object' && global.global === global && global;

if (typeof root.exports !== 'undefined') {
  if (typeof module !== 'undefined' && module.exports) {
    exports = module.exports = Exim;
  }
  exports.Exim = Exim;
} else {
  root.Exim = Exim;
}
