import {Action, Actions} from './Actions'
import Store from './Store'
import helpers from './helpers'
import Getter from './Getter'
import GlobalStore from './GlobalStore'

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

Exim.listen = function (args) {
  let stores = new Object();
  args.forEach(function(path) {
    let pathBits = path.split('/');
    let pathLength = pathBits.length

    if(pathLength > 1) {
      let storePath = pathBits.slice(0, pathLength - 1).join('/');
      let varPath = pathBits.slice(pathLength - 1)[0];

      stores[storePath] = Array.isArray(stores[storePath]) ? stores[storePath].concat(varPath) : [varPath]
    }
  });

  let mixins = []
  Object.keys(stores).forEach(function(path) {
    let store = GlobalStore.findStore(path);
    mixins.push(store.getter.connect.apply(store.getter, stores[path]));
  });

  return mixins;
};

Exim.stores = GlobalStore.getStore();

const root = typeof self === 'object' && self.self === self && self || typeof global === 'object' && global.global === global && global;

if (typeof root.exports !== 'undefined') {
  if (typeof module !== 'undefined' && module.exports) {
    exports = module.exports = Exim;
  }
  exports.Exim = Exim;
} else {
  root.Exim = Exim;
}
