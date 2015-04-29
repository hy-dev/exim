import Action from './Action'
import Store from './Store'

var Exim = {
  _stores: []
}

Exim.Action = Action;
Exim.Store = Store;

var createGetter = function (store) {
  a = 1
};

Exim.createStore = function (args) {
  var store = new Store(args)
  var getter = {}
}


Exim.createStore({
  getInitial: function () {
    return {}
  },
})

window.Exim = Exim;
