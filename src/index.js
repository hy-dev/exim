import {Action, Actions} from './Actions'
import Store from './Store'
import helpers from './helpers'
import {createView, Router} from './DOMHelpers'

const Exim = {Action, Actions, Store, Router, helpers}

Exim.createStore = function (args) {
  return new Store(args);
}

Exim.createView = createView;

window.Exim = Exim;
