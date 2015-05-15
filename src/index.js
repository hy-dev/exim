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

if (typeof window === 'undefined') {
  module.exports = Exim;
} else {
  window.Exim = Exim;
}
