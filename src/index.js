import {Action, Actions} from './Actions';
import Store from './Store';
import helpers from './helpers';
import Getter from './Getter';
import GlobalStore from './GlobalStore';

import {createView, getRouter, Router, DOM} from './DOMHelpers';

const Exim = {Action, Actions, Store, Router, DOM, helpers, createView, getRouter};

Exim.createAction = function(args) {
  return new Action(args);
};

Exim.createActions = function(args) {
  return new Actions(args);
};

Exim.createStore = function(args) {
  return new Store(args);
};

Exim.listen = function(args) {
  const stores = {};
  args.forEach(function(path) {
    const pathBits = path.split('/');
    const pathLength = pathBits.length;

    if (pathLength > 1) {
      const storePath = pathBits.slice(0, pathLength - 1).join('/');
      const tPath = pathBits.slice(pathLength - 1)[0];

      stores[storePath] = Array.isArray(stores[storePath]) ?
        stores[storePath].concat(tPath) : [tPath];
    }
  });

  const mixins = [];
  Object.keys(stores).forEach(function(path) {
    const store = GlobalStore.findStore(path);
    mixins.push(store._getter.connect.apply(store._getter, stores[path]));
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
