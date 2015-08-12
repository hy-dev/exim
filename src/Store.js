import {Actions} from './Actions';
import utils from './utils';
import Freezer from 'freezer-js';
import getConnectMixin from './mixins/connect';


export default class Store {
  constructor(args={}) {
    let {actions, initial} = args;
    let init = typeof initial === 'function' ? initial() : initial;
    let store = new Freezer(init || {});

    this.connect = function (...args) {
      return getConnectMixin(this, args.concat(args));
    };

    this.handlers = args.handlers || utils.getWithoutFields(['actions'], args) || {};

    if (Array.isArray(actions)) {
      this.actions = actions = new Actions(actions);
      this.actions.addStore(this);
    }

    const set = function (item, value) {
      store.get().set(item, value);
    };

    const get = function (item) {
      if (item)
        return store.get().toJS()[item];
      return store.get();
    };

    const reset = function () {
      this.set(init);
    };

    this.set = set;
    this.get = get;
    this.reset = reset;
    this.store = store;

    this.stateProto = {set, get, reset, actions};
    //this.getter = new Getter(this);
    return this;
  }

  addAction(item) {
    if (Array.isArray(item)) {
      this.actions = this.actions.concat(this.actions);
    } else if (typeof item === 'object') {
      this.actions.push(item);
    }
  }

  removeAction(item) {
    var action;
    if (typeof item === 'string') {
      action = this.findByName('actions', 'name', item);
      if (action) action.removeStore(this);
    } else if (typeof item === 'object') {
      action = item;
      let index = this.actions.indexOf(action);
      if (index !== -1) {
        action.removeStore(this);
        this.actions = this.actions.splice(index, 1);
      }
    }
  }

  getActionCycle(actionName, prefix='on') {
    const capitalized = utils.capitalize(actionName);
    const fullActionName = `${prefix}${capitalized}`;
    const handler = this.handlers[fullActionName] || this.handlers[actionName];
    if (!handler) {
      throw new Error(`No handlers for ${actionName} action defined in current store`);
    }

    let actions;
    if (typeof handler === 'object') {
      actions = handler;
    } else if (typeof handler === 'function') {
      actions = {on: handler};
    } else {
      throw new Error(`${handler} must be an object or function`);
    }
    return actions;
  }

  // 1. will(initial) => willResult
  // 2. while(true)
  // 3. on(willResult || initial) => onResult
  // 4. while(false)
  // 5. did(onResult)
  runCycle(actionName, ...args) {
    // new Promise(resolve => resolve(true))
    const cycle = this.getActionCycle(actionName);
    let promise = Promise.resolve();
    let will = cycle.will, while_ = cycle.while, on_ = cycle.on;
    let did = cycle.did, didNot = cycle.didNot;

    // Local state for this cycle.
    let state = Object.create(this.stateProto);

    // Pre-check & preparations.
    if (will) promise = promise.then(() => {
      return will.apply(state, args);
    });

    // Start while().
    if (while_) promise = promise.then((willResult) => {
      while_.call(state, true);
      return willResult;
    });

    // Actual execution.
    promise = promise.then((willResult) => {
      if (willResult == null) {
        return on_.apply(state, args);
      } else {
        return on_.call(state, willResult);
      }
    });

    // Stop while().
    if (while_) promise = promise.then((onResult) => {
      while_.call(state, false);
      return onResult;
    });

    // For did and didNot state is freezed.
    promise = promise.then((onResult) => {
      Object.freeze(state);
      return onResult;
    });

    // Handle the result.
    if (did) promise = promise.then(onResult => {
      return did.call(state, onResult);
    });

    promise.catch(error => {
      if (while_) while_.call(this, state, false);
      if (didNot) {
        didNot.call(state, error);
      } else {
        throw error;
      }
    });

    return promise;
  }
}
