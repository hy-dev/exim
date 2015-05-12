import Action from './Action'
import {Store, Getter}  from './Store'

const Exim = {
  _stores: []
}

Exim.Action = Action;
Exim.Store = Store;
Exim.Getter = Getter;


Exim.createStore = function (args) {
  var store = new Store(args);
  var getter = new Getter(store);
  return getter;
}

window.Exim = Exim;
