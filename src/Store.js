import {Actions} from './Actions';
import connect from './mixins/connect';
import Getter from './Getter';
import utils from './utils';
import GlobalStore from './GlobalStore';

const printTraces = function(actionName, error) {
  let msg = 'Exim: Uncaught error in %s';
  if (error.eximStack) msg += ' => ' + error.eximStack;
  if (error.message) {
    console.error(msg, actionName, error.message, ' ', error.stack);
  } else {
    console.error(msg, actionName, error);
  }
};

const reservedActionNames = {
  path: true, handlers: true, propTypes: true, initial: true,
  connect: true, get: true, set: true, reset: true
};

export default class Store {
  constructor(args={}) {
    const {initial} = args;
    let {path, actions} = args;
    if (path == null) path = `nopath/${utils.generateId()}`;
    const initValue = (typeof initial === 'function' ? initial() : initial) || {};
    this.initial = initValue;
    this.path = path;
    GlobalStore.init(path, initValue, this);

    let stateUpdates = {};

    if (actions == null) {
      actions = Object.keys(args).filter(name => !reservedActionNames[name]);
    }

    this.handlers = args.handlers || utils.getWithoutFields(['actions'], args) || {};
    const helpers = args.helpers || {};

    if (Array.isArray(actions)) {
      this.actions = actions = new Actions(actions);
      this.actions.addStore(this);
    }

    const propTypes = args.propTypes;
    const checkPropType = (propName, value) => {
      if (!propTypes || !propTypes[propName]) return;
      const obj = {};
      obj[propName] = value;
      const error = propTypes[propName](obj, propName, path, 'prop');
      if (error) throw error;
    };

    const setValue = (key, value) => {
      checkPropType(key, value);
      GlobalStore.set(path, key, value);
    };

    const getValue = (key, preserved) => {
      if (preserved && key in stateUpdates) {
        return stateUpdates[key];
      }
      return GlobalStore.get(path, key);
    };

    const setPreservedValue = (key, value) => {
      checkPropType(key, value);
      stateUpdates[key] = value;
    };

    const getPreservedValue = key => getValue(key, true);

    const removeValue = key => GlobalStore.remove(path, key);

    const set = (item, value, options={}) => {
      if (utils.isObject(item)) {
        if (utils.isObject(value)) options = value;
        let key;
        for (key in item) {
          setValue(key, item[key], options);
        }
      } else {
        setValue(item, value, options);
      }
      if (!options.silent) {
        this._getter.emit();
      }
    };

    const _get = (item) => {
      if (typeof item === 'string' || typeof item === 'number') {
        return getValue(item);
      } else if (Array.isArray(item)) {
        return item.map(key => getValue(key));
      } else if (!item) {
        return getValue();
      } else if (typeof item === 'object') {
        const result = {};
        let key;
        for (key in item) {
          const val = item[key];
          const type = typeof val;
          if (type === 'function') {
            result[key] = item[key](getValue(key));
          } else if (type === 'string') {
            result[key] = getValue(key)[val];
          }
        }
        return result;
      }
    };

    const get = (...items) => {
      if (items.length === 1) {
        return _get(items[0]);
      } else {
        return items.map(_get);
      }
    };

    const reset = (item, options={}) => {
      if (item) {
        setValue(item, initValue[item]);
      } else {
        removeValue(item);
      }
      if (!options.silent) {
        this._getter.emit();
      }
    };

    const preserve = (arg1, arg2) => {
      if (typeof arg2 === 'undefined') {
        Object.keys(arg1).forEach(function(key) {
          setPreservedValue(key, arg1[key]);
        });
      } else {
        setPreservedValue(arg1, arg2);
      }
    };

    const getPreserved = (item) => {
      if (typeof item === 'string' || typeof item === 'number') {
        return getPreservedValue(item);
      } else if (Array.isArray(item)) {
        return item.map(key => getPreservedValue(key));
      } else if (!item) {
        return getPreservedValue();
      } else if (typeof item === 'object') {
        const result = {};
        let key;
        for (key in item) {
          const val = item[key];
          const type = typeof val;
          if (type === 'function') {
            result[key] = item[key](getPreservedValue(key));
          } else if (type === 'string') {
            result[key] = getPreservedValue(key)[val];
          }
        }
        return result;
      }
    };

    const getPreservedState = () => {
      const newState = stateUpdates;
      stateUpdates = {};
      return newState;
    };

    this.set = set;
    this.get = get;
    this.reset = reset;

    const defaultStateHelpers = {set, get, reset, path, actions};
    const defaultPreserverHelpers = {set: preserve, get: getPreserved, reset, path, actions, getPreservedState};

    const stateHelpers = utils.extend(helpers, defaultStateHelpers);
    const preserverHelpers = utils.extend(helpers, defaultPreserverHelpers);

    const customStateHelpers = utils.bindValues(helpers, stateHelpers);
    const customPreserverHelpers = utils.bindValues(helpers, preserverHelpers);

    this._stateProto = utils.extend(customStateHelpers, defaultStateHelpers);
    this._preserverProto = utils.extend(customPreserverHelpers, defaultPreserverHelpers);

    return this._getter = new Getter(this);
  }

  addAction(item) {
    if (Array.isArray(item)) {
      this.actions = this.actions.concat(item);
    } else if (typeof item === 'object') {
      this.actions.push(item);
    }
  }

  removeAction(item) {
    let action;
    if (typeof item === 'string') {
      action = this.findByName('actions', 'name', item);
      if (action) action.removeStore(this);
    } else if (typeof item === 'object') {
      action = item;
      const index = this.actions.indexOf(action);
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
    // if (Array.isArray(handler)) {
    //   actions = handlers;
    // } else
    if (typeof handler === 'object') {
      // actions = utils.mapActionNames(handler);
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
    const will = cycle.will, while_ = cycle.while, on_ = cycle.on;
    const did = cycle.did, didNot = cycle.didNot;

    // Local state for this cycle.
    const state = Object.create(this._stateProto);
    const preserver = Object.create(this._preserverProto);
    let lastStep = 'will';

    const rejectAction = function(trace, error) {
      printTraces(trace, error);
      if (!error.eximStack) error.eximStack = trace;
      return Promise.reject(error);
    };

    // Pre-check & preparations.

    const updateState = () => {
      const preservedState = preserver.getPreservedState();
      const stateChanged = Object.keys(preservedState).length;
      if (stateChanged) state.set(preservedState);
    };

    const transaction = function(cycleName, body) {
      let result;
      lastStep = cycleName;

      updateState(preserver);
      if (typeof body !== 'function') return;

      try {
        result = body();
      } catch (error) {
        return Promise.reject(error);
      }

      const resultIsPromise = result != null && typeof result.then === 'function';

      if (resultIsPromise) {
        return result.then(res => Promise.resolve(res));
      } else {
        return Promise.resolve(result);
      }
    };

    if (will) {
      promise = promise.then(() => transaction('will', () => {
        return will.apply(preserver, args);
      }));
    }

    if (while_) {
      while_.call(state, true);
    }
    // Actual execution.
    promise = promise.then(willResult => transaction('on', () => {
      if (willResult == null) {
        return on_.apply(preserver, args);
      } else {
        return on_.call(preserver, willResult);
      }
    }));

    // For did and didNot state is freezed.
    promise = promise.then((onResult) => {
      Object.freeze(state);
      return onResult;
    });

    // Handle the result.
    if (did) {
      promise = promise.then(onResult => {
        if (while_) {
          transaction('while', function() {
            while_.call(preserver, false);
          });
        }
        return transaction('did', function() {
          return did.call(preserver, onResult);
        });
      });
    }

    // TODO: check while for duplication.
    if (!did && while_) {
      promise = promise.then(onResult => {
        return transaction('while', function() {
          return while_.call(preserver, false);
        });
      });
    }

    promise = promise.then((arg) => {
      transaction('was');
      return arg;
    });

    promise = promise.catch(error => {
      const start = actionName + '#';
      let result;
      if (didNot) {
        result = transaction('didNot', function() {
          if (while_) while_.call(preserver, false);
          didNot.call(preserver, error).catch(error => {
            return rejectAction(start + 'didNot', error);
          });
        });
      } else {
        result = transaction(lastStep, function() {
          if (while_) while_.call(preserver, false);
          return rejectAction(start + lastStep, error);
        });
      }
      transaction('was');
      return result;
    });

    return promise;
  }
}
