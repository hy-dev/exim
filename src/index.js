import {Action, Actions} from './Actions'
import Store from './Store'

const Exim = {Action, Actions, Store}

Exim.createStore = function (args) {
  return new Store(args);
}

window.Exim = Exim;
