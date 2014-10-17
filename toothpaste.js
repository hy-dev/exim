(function(root, factory) {
  "use strict";
  // Set up Toothpaste appropriately for the environment.
  if (typeof define === 'function' && define.amd) {
    define(['exports'], function(exports) {
      return factory(root, exports);
    });
  } else if (typeof exports !== 'undefined') {
    factory(root, exports);
  } else {
    root.Toothpaste = factory(root, {});
  }
})(this, function(root, Toothpaste) {
  "use strict";

  // Flux
  // Fluxy
  // Router
  // Data fetcher
  // stuff for global data access (https://github.com/dustingetz/react-cursor)
  // conventions
  // coffee DOM helpers / addons


  // Brunch first-class support
  // grunt / gulp / broccoli skeletols
  // git@github.com:hellyeahllc/toothpaste.git



  /*
   * Copyright (c) 2014, Facebook, Inc.
   * All rights reserved.
   *
   * This source code is licensed under the BSD-style license found in the
   * LICENSE file in the root directory of this source tree. An additional grant
   * of patent rights can be found in the PATENTS file in the same directory.
   *
   * @providesModule Dispatcher
   * @typechecks
   */


  /**
   * Use invariant() to assert state which your program assumes to be true.
   *
   * Provide sprintf-style format (only %s is supported) and arguments
   * to provide information about what broke and what you were
   * expecting.
   *
   * The invariant message will be stripped in production, but the invariant
   * will remain to ensure logic does not differ in production.
  **/

  if (!React) {
    throw("React required")
  } else if (!ReactRouter) {
    throw("ReactRouter required")
  }
var utils = {}

utils.inherits = function(ctor, parent) {
    ctor.super_ = parent;
    ctor.prototype = Object.create(parent.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };

utils.extend = function(obj, item) {
  for (var key in item) obj[key] = item[key];
  return obj;
};

utils.convertName = function (name) {
  var low = name.toLowerCase();
  var res = low.replace(/_(\w{1})/g, function (match, letter) {
    return letter.toUpperCase();
  });
  return res;
};
var constructArgs = function (serviceName, args) {
  var arrArgs = Array.prototype.slice.call(args);
  arrArgs.unshift(serviceName);
  return arrArgs;
};

var EximAction = function () {
 this._configureServiceActions();
};

EximAction.prototype = utils.extend(EximAction.prototype, {
  actions: {},
  serviceActions: {},
  mount: function (flux) {
    this.flux = flux;
    this.dispatchAction = flux.dispatchAction.bind(flux);
  },
  _configureServiceActions: function () {
    var self = this;
    Object.keys(this.serviceActions).forEach(function (key) {
      var pair = self.serviceActions[key];
      var serviceName = pair[0].value;
      var actionName = key;
      if (self[actionName]) {
        throw new Error('Cannot assign duplicate function name "' + actionName + '"');
      }

      self[actionName] = function () {
        var args = constructArgs(serviceName, arguments);
        self.dispatchAction.apply(self.flux, args);
        return pair[1].apply(self, Array.prototype.slice.call(arguments))
          .then(function (result) {
            self.dispatchAction(serviceName+'_COMPLETED', result);
          })
          .catch(function (err) {
            self.dispatchAction(serviceName+'_FAILED', err);
          });
      };
    });
  },
});

EximAction.extend = function (ChildProto) {
  var ChildFn = function () {
    EximAction.call(this);
  };
  utils.inherits(ChildFn, EximAction);
  ChildFn.prototype = utils.extend(ChildFn.prototype, ChildProto);
  return ChildFn;
};
/**
 * An Enum factory
 * @param {object} constants - a hash of constant values
 *
 * Creates a new Enum for the provided constants. There are three types of constants:
 *  * serviceMessages: automatically have complimented COMPLETED and FAILED messages created
 *  * messages: a string constant, where the value is the same as the key
 *  * values: a string -> constant value lookup
 *
 * serviceMessages and messages should be specified as Array<String>. Values should be a hash.
 *
 */

var ConstantsFactory = function (constants) {
  var values = {};
  if (constants) {
    if (constants.serviceMessages) {
      constants.serviceMessages.forEach(function (key) {
        var messages = [key, key+'_COMPLETED', key+'_FAILED'];
        messages.forEach(function (m) { values[m] = m; });
      });
    }
    if (constants.messages) {
      constants.messages.forEach(function (key) {
        values[key] = key;
      });
    }
    if (constants.values) {
      Object.keys(constants.values).forEach(function (key) {
        values[key] = constants.values[key];
      });
    }
  }

  var result = {};
  var enums = [];
  Object.keys(values).forEach(function(key, index) {
    result[key] = {
      key: key,
      value: values[key]
    }
    enums.push(result[key])
  });
  result.enums = enums;
  return result;
};
/**
 * Copyright 2014 Justin Reidy
 *
 * Dispatcher
 *
 * The Dispatcher is capable of registering callbacks and invoking them.
 * More robust implementations than this would include a way to order the
 * callbacks for dependent Stores, and to guarantee that no two stores
 * created circular dependencies.
 */

var Dispatcher = function () {
  this._actions = {};
  this._tokens = {};
  this._currentDispatch = undefined;
  this._dispatchQueue = [];

  this._registerActionHandler = function (action, handler) {
    this._actions[action.key] = this._actions[action] || [];
    return this._actions[action.key].push(handler);
  };

  this._processQueue = function () {
    this._tokens = {};
    var nextDispatch = this._dispatchQueue.shift();
    if (nextDispatch) {
      this.dispatchAction(nextDispatch.action, nextDispatch.payload);
    }
  };

  this._activatePromise = function (idx, handler, args) {
    var promise = this._tokens[idx];
    if (!promise) {
      promise = handler.apply(null, args);
      this._tokens[idx] = promise;
    }
    return promise;
  };
};

Dispatcher.prototype = utils.extend(Dispatcher.prototype, {
  /**
   * register a callback function to an action
   * @param {string} action The name of the action to register against
   * @param {handler} function A handler function that will be invoked with payload
   */
  registerAction: function (action, handler) {
    handler = Promise.method(handler);
    var idx = this._registerActionHandler(action, handler);
    var actionHandler = function () {
      return this._tokens[idx];
    };
    actionHandler._id = handler;
    return actionHandler;
  },

  /**
   * register an action with explicit dependencies
   * The dependencies are executed serially
   * @param {string} action The name of the action to register against
   * @param {array} actionHandlers Array of handlers that prevede this handler
   * @param {function} handler The action handler fn
   */
  registerDeferedAction: function (action, actionHandlers, handler) {
    var self = this;

    return this.registerAction(action, function (payload) {
      var handlerIndexes = actionHandlers.map(function (func) {
        return self._actions[action].indexOf(func._id);
      });
      return Promise.reduce(handlerIndexes, function (current, idx) {
        return self._activatePromise(idx, self._actions[action][idx], payload);
      }, 0
      ).then(function () {
        return handler(payload);
      });
    });
  },

  /**
   * dispatch a named action with a payload
   * @param  {action} action The name of the action to dispatch
   * @param  {object} payload The data from the action.
   */
  dispatchAction: function(action, payload) {
    var self = this;
    if (action.key) {
      action = action.key;
    }
    var handlers = this._actions[action];
    if (!handlers || handlers.length < 1) {
      return;
    }

    if (arguments.length > 2) {
      payload = Array.prototype.slice.call(arguments, 1);
    }
    else {
      payload = [payload];
    }

    if (!this._currentDispatch || this._currentDispatch.isResolved()) {
        this._currentDispatch = Promise.map(
            handlers,
            function (handler, idx) {
              return self._activatePromise(idx, handler, payload);
            }
        );
        this._currentDispatch.finally(this._processQueue.bind(this));
    }
    else {
      this._dispatchQueue.push({action: action, payload: payload});
    }
  }
});
var getActionKeyForName = function (actionName) {
  var name = actionName;
  if (name.value) {
    name = name.value;
  }
  name = utils.convertName(name);
  name = name.charAt(0).toUpperCase() + name.substr(1, name.length);
  return 'handle'+name;
};

var toArray = function (val) {
  if (!Array.isArray(val)) {
    val = [val];
  }
  return val;
};

var updateKeys = function(coll, key, val) {
  var newColl = {};
  utils.extend(newColl, coll);
  newColl[key] = val;
  return newColl;
};

var EximStore = function () {};

EximStore.prototype = utils.extend(EximStore.prototype, {
  _getFlux: function () {
    if (!this.flux) {
      throw new Error("Flux instance not defined. Did you call Flux.start()?");
    }
    else {
      return this.flux;
    }
  },
  _updateState: function (newState) {
    this.state = newState;
    this.states = this.states.concat([newState]);
  },
  _resetState: function () {
    this.state = this.getInitialState();
      this.states = [this.state];
  },
  _registerAction: function (actionName, actionKey, handler, waitForHandlers) {
    var registeredAction;
    var flux = this._getFlux();
    if (waitForHandlers) {
      registeredAction = flux.registerDeferedAction(actionName, waitForHandlers, handler.bind(this));
    }
    else {
      registeredAction = flux.registerAction(actionName, handler.bind(this));
    }
    this[actionKey] = registeredAction;
    this._actionMap[actionName] = registeredAction;
  },
  _configureActions: function () {
    var self = this;
    var flux = this._getFlux();
    this._actionMap = {};

    if (this.actions) {
      this.actions.forEach(function (action) {
        if (!action[0]) {
          throw new Error("Action name must be provided");
        }
        if (action.length < 2 || (typeof action[action.length-1] !== "function")) {
          throw new Error("Action handler must be provided");
        }

        var actionName = action[0];
        var actionKey = getActionKeyForName(actionName);

        if (action.length === 2) {
          self._registerAction(actionName, actionKey, action[1]);
        }
        else {
          var opts = action[1];
          var handler = action[2];
          var waitFor = opts.waitFor;
          if (waitFor) {
            if (!Array.isArray(waitFor)) {
              waitFor = [waitFor];
            }
            var waitForHandlers = waitFor.map(function(store) {
              return store._getHandlerFor(actionName);
            });
            self._registerAction(actionName, actionKey, handler, waitForHandlers);
          }
        }
      });
    }
  },

  _getHandlerFor: function (actionName) {
    return this._actionMap[actionName];
  },

  _notify: function(keys, oldState, newState) {
    this.watchers.forEach(function (w) {
      w(keys, oldState, newState);
    });
  },

  addWatch: function (watcher) {
    this.watchers.push(watcher);
  },

  removeWatch: function (watcher) {
    this.watchers = this.watchers.filter(function (w) {
      return w !== watcher;
    });
  },

  mount: function (flux) {
    this.flux = flux;

    this.watchers = [];
    this._resetState();
    this._configureActions();
  },

  //state
  getInitialState: function () {
    return {};
  },

  get: function (keys) {
    if (typeof keys === 'string') {
      return this.state[keys];
    }
    throw new Error('get_in is not implemented');
    //return mori.get_in(this.state, keys);
  },

  getAsJS: function (keys) {
    return this.state[keys];
  },

  toJS: function (val) {
    return val;
  },

  set: function (key, value) {
    var oldState = this.state;
    var newState = updateKeys(this.state, key, value);
    this._updateState(newState);
    this._notify([key], oldState, newState);
  },

  setFromJS: function (key, value) {
    var oldState = this.state;
    var newState = updateKeys(this.state, key, value);
    this._updateState(newState);
    this._notify([key], oldState, newState);
  },

  undo: function () {
      var oldState = this.state;
      var st = this.states;
      if (st.length > 1) {
        var lastIndex = st.length - 1;
        this.state = st[lastIndex];
        this.states = st.slice(0, lastIndex)
      }
      this._notify('*', oldState, this.state);
    },

  replaceState: function (state) {
    this.state = state;
    this.states = [this.state];
  },
  request: ajax
});

EximStore.extend = function (ChildFn, ChildProto) {
  utils.inherits(ChildFn, EximStore);
  if (ChildProto) {
    ChildFn.prototype = utils.extend(ChildFn.prototype, ChildProto);
  }
  //TODO: iterate over specific FN names
  return ChildFn;
};
var stores  = [];
var actions = [];

var assignDataToStore = function(initialData, Store) {
  if (Store.name && initialData) {
    var state = initialData[Store.name];
    if (state) {
      Store.replaceState(state);
    }
  }
};

var safeStringify = function (obj) {
  return JSON.stringify(obj).replace(/<\//g, '<\\\\/').replace(/<\!--/g, '<\\\\!--');
};


var Fluxy = function () {
  this._dispatcher = new Dispatcher();
};

Fluxy.createStore = function (proto) {
  var Store = EximStore.extend(function () {
    EximStore.call(this);
  }, proto);
  var store = new Store();
  stores.push(store);
  return store;
};

Fluxy.createActions = function (proto) {
  var Action = EximAction.extend(proto);
  var action = new Action();
  actions.push(action);
  return action;
};

Fluxy.createConstants = function (values) {
  return ConstantsFactory(values);
};

Fluxy.start = function (initialData) {
  var flux = new Fluxy();
  stores.forEach(function (store) {
    store.mount(flux);
    assignDataToStore(initialData, store);
  });
  actions.forEach(function (action) {
    action.mount(flux);
  });
  return flux;
};

Fluxy.bootstrap = function (key, context) {
  var initialData;
  if (!context && window) {
    context = window;
  }

  if (context && context[key]) {
    initialData = context[key];
  }

  Fluxy.start(initialData);
};

Fluxy.renderStateToString = function (serializer) {
  var state = {};
  serializer = serializer || safeStringify;
  stores.forEach(function (store) {
    if (store.name) {
      state[store.name] = store.toJS(store.state);
    }
  });

  return serializer(state);
};

Fluxy.reset = function () {
  stores = [];
  actions = [];
};


Fluxy.prototype = utils.extend(Fluxy.prototype, {
  //dispatcher delegation
  registerAction: function () {
    return this._dispatcher.registerAction.apply(this._dispatcher, arguments);
  },
  registerDeferedAction: function () {
    return this._dispatcher.registerDeferedAction.apply(this._dispatcher, arguments);
  },
  dispatchAction: function () {
    return this._dispatcher.dispatchAction.apply(this._dispatcher, arguments);
  },
});
  Toothpaste = Fluxy;

  Toothpaste.cx = function (classNames) {
    if (typeof classNames == 'object') {
      return Object.keys(classNames).filter(function(className) {
        return classNames[className];
      }).join(' ');
    } else {
      return Array.prototype.join.call(arguments, ' ');
    }
  };

  var domHelpers = {};

  var tag = function(name) {
    var args, attributes;
    args = [].slice.call(arguments, 1);
    var first = args[0] && args[0].constructor;
    if (first === Object) {
      attributes = args.shift();
    } else {
      attributes = {};
    }
    return React.DOM[name].apply(React.DOM, attributes.concat(args));
  };

  Object.keys(React.DOM).forEach(function (tagName) {
    domHelpers[tagName] = tag.bind(this, tagName);
  });

  Toothpaste.DOM = domHelpers;

  return Toothpaste;
});
