!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Exim=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _Actions = require("./Actions");

var Action = _Actions.Action;
var Actions = _Actions.Actions;

var Store = _interopRequire(require("./Store"));

var helpers = _interopRequire(require("./helpers"));

var _DOMHelpers = require("./DOMHelpers");

var createView = _DOMHelpers.createView;
var Router = _DOMHelpers.Router;
var DOM = _DOMHelpers.DOM;

var Exim = { Action: Action, Actions: Actions, Store: Store, Router: Router, DOM: DOM, helpers: helpers, createView: createView };

Exim.createAction = function (args) {
  return new Action(args);
};

Exim.createActions = function (args) {
  return new Actions(args);
};

Exim.createStore = function (args) {
  return new Store(args);
};

module.exports = Exim;

},{"./Actions":2,"./DOMHelpers":3,"./Store":6,"./helpers":8}],2:[function(require,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var Action = exports.Action = (function () {
  function Action(args) {
    _classCallCheck(this, Action);

    var store = args.store;
    var stores = args.stores;
    var allStores = [];

    this.name = args.name;

    if (store) allStores.push(store);
    if (stores) allStores.push.apply(allStores, stores);

    this.stores = allStores;
  }

  _createClass(Action, {
    run: {
      value: function run() {
        var _this = this;

        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        var storesCycles = this.stores.map(function (store) {
          return store.runCycle.apply(store, [_this.name].concat(args));
        });
        return Promise.all(storesCycles);
      }
    },
    addStore: {
      value: function addStore(store) {
        this.stores.push(store);
      }
    }
  });

  return Action;
})();

var Actions = exports.Actions = (function () {
  function Actions(actions) {
    var _this = this;

    _classCallCheck(this, Actions);

    this.all = [];
    if (Array.isArray(actions)) {
      actions.forEach(function (action) {
        return _this.addAction(action);
      }, this);
    }
  }

  _createClass(Actions, {
    addAction: {
      value: function addAction(item, noOverride) {
        var action = noOverride ? false : this.detectAction(item);
        if (!noOverride) {
          var old = this[action.name];
          if (old) this.removeAction(old);
          this.all.push(action);
          this[action.name] = action.run.bind(action);
        }

        return action;
      }
    },
    removeAction: {
      value: function removeAction(item) {
        var action = this.detectAction(item, true);
        var index = this.all.indexOf(action);
        if (index !== -1) this.all.splice(index, 1);
        delete this[action.name];
      }
    },
    addStore: {
      value: function addStore(store) {
        this.all.forEach(function (action) {
          return action.addStore(store);
        });
      }
    },
    detectAction: {
      value: function detectAction(action, isOld) {
        if (action.constructor === Action) {
          return action;
        } else if (typeof action === "string") {
          return isOld ? this[action] : new Action({ name: action });
        }
      }
    }
  });

  return Actions;
})();

},{}],3:[function(require,module,exports){
(function (global){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

exports.createView = createView;
Object.defineProperty(exports, "__esModule", {
  value: true
});

var React = _interopRequire((typeof window !== "undefined" ? window['React'] : typeof global !== "undefined" ? global['React'] : null));

var ReactRouter = _interopRequire((typeof window !== "undefined" ? window['ReactRouter'] : typeof global !== "undefined" ? global['ReactRouter'] : null));

function getRouter() {
  var Router = {};
  if (typeof ReactRouter !== "undefined") {
    var routerElements = ["Route", "DefaultRoute", "RouteHandler", "ActiveHandler", "NotFoundRoute", "Link", "Redirect"],
        routerMixins = ["Navigation", "State"],
        routerFunctions = ["create", "createDefaultRoute", "createNotFoundRoute", "createRedirect", "createRoute", "createRoutesFromReactChildren", "run"],
        routerObjects = ["HashLocation", "History", "HistoryLocation", "RefreshLocation", "StaticLocation", "TestLocation", "ImitateBrowserBehavior", "ScrollToTopBehavior"],
        copiedItems = routerMixins.concat(routerFunctions).concat(routerObjects);

    routerElements.forEach(function (name) {
      Router[name] = React.createElement.bind(React, ReactRouter[name]);
    });

    copiedItems.forEach(function (name) {
      Router[name] = ReactRouter[name];
    });
  }
  return Router;
}

function getDOM() {
  var DOMHelpers = {};

  if (typeof React !== "undefined") {
    var tag = function tag(name) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var attributes = undefined;
      var first = args[0] && args[0].constructor;
      if (first === Object) {
        attributes = args.shift();
      } else {
        attributes = {};
      }
      return React.DOM[name].apply(React.DOM, [attributes].concat(args));
    };

    for (var tagName in React.DOM) {
      DOMHelpers[tagName] = tag.bind(this, tagName);
    }

    DOMHelpers.space = function () {
      return React.DOM.span({
        dangerouslySetInnerHTML: {
          __html: "&nbsp;"
        }
      });
    };
  }
  return DOMHelpers;
}

var Router = getRouter();
exports.Router = Router;
var DOM = getDOM();

exports.DOM = DOM;

function createView(classArgs) {
  var ReactClass = React.createClass(classArgs);
  var ReactElement = React.createElement.bind(React.createElement, ReactClass);
  return ReactElement;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],4:[function(require,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var _default = (function () {
  var _class = function _default() {
    _classCallCheck(this, _class);

    this._listeners = [];
  };

  _createClass(_class, {
    findListenerIndex: {
      value: function findListenerIndex(listener) {
        return this._listeners.indexOf(listener);
      }
    },
    _addListener: {
      value: function _addListener(listener, context) {
        var found = this.findListenerIndex(listener) >= 0;
        if (!found) {
          if (context) listener._ctx = context;
          this._listeners.push(listener);
        }
        return this;
      }
    },
    _removeListener: {
      value: function _removeListener(listener) {
        var index = undefined,
            found = (index = this.findListenerIndex(listener)) >= 0;
        if (found) {
          this._listeners.splice(index, 1);
        }
        return this;
      }
    },
    emit: {
      value: function emit() {
        this._listeners.forEach(function (listener) {
          return listener._ctx ? listener.call(listener._ctx) : listener();
        });
      }
    }
  });

  return _class;
})();

module.exports = _default;

},{}],5:[function(require,module,exports){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) { _arr.push(_step.value); if (i && _arr.length === i) break; } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } };

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var Emitter = _interopRequire(require("./Emitter"));

var config = _interopRequire(require("./config"));

var getConnectMixin = _interopRequire(require("./mixins/connect"));

var Getter = (function (_Emitter) {
  function Getter(store) {
    var _this = this;

    _classCallCheck(this, Getter);

    _get(Object.getPrototypeOf(Getter.prototype), "constructor", this).call(this);

    // Copy allowed props to getter.
    config.allowedGetterProps.forEach(function (prop) {
      return _this[prop] = store[prop];
    });

    // Consistent names for emitter methods.
    var _ref = [this._addListener, this._removeListener];

    var _ref2 = _slicedToArray(_ref, 2);

    this.onChange = _ref2[0];
    this.offChange = _ref2[1];

    // Connect mixin binded to getter.
    this.connect = function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return getConnectMixin.apply(null, [this].concat(args));
    };
  }

  _inherits(Getter, _Emitter);

  return Getter;
})(Emitter);

module.exports = Getter;

},{"./Emitter":4,"./config":7,"./mixins/connect":9}],6:[function(require,module,exports){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var Actions = require("./Actions").Actions;

var Getter = _interopRequire(require("./Getter"));

var utils = _interopRequire(require("./utils"));

var Store = (function () {
  function Store() {
    var args = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Store);

    var actions = args.actions;
    var initial = args.initial;

    this.initial = initial = typeof initial === "function" ? initial() : initial;
    var store = initial ? Object.assign(initial) : {};

    var privateMethods = undefined;
    if (!args.privateMethods) {
      privateMethods = new Set();
    } else if (Array.isArray(args.privateMethods)) {
      privateMethods = new Set();
      // private set is undefined
      // args.privateMethods.forEach(m => privateSet.add(m));
      // args.privateMethods = privateSet;
    } else if (args.privateMethods.constructor === Set) {
      privateMethods = args.privateMethods;
    }
    this.privateMethods = privateMethods;

    this.handlers = args.handlers || utils.getWithoutFields(["actions"], args) || {};

    if (Array.isArray(actions)) {
      this.actions = actions = new Actions(actions);
      this.actions.addStore(this);
    }

    var _this = this;

    var setValue = function setValue(key, value) {
      store[key] = value;
    };

    var getValue = function getValue(key) {
      return Object.assign(key ? store[key] : store);
    };

    var removeValue = function removeValue(key) {
      var success = false;
      if (!key) {
        for (var _key in store) {
          store[_key] = initial[_key];
        }
      } else {
        store[key] = initial[key];
      }
      return success;
    };

    var set = function set(item, value) {
      var options = arguments[2] === undefined ? {} : arguments[2];

      if (utils.isObject(item)) {
        for (var key in item) {
          setValue(key, item[key], options);
        }
      } else {
        setValue(item, value, options);
      }
      if (!options.silent) {
        _this.getter.emit();
      }
    };

    var get = function get(item) {
      if (typeof item === "string" || typeof item === "number") {
        return getValue(item);
      } else if (Array.isArray(item)) {
        return item.map(function (key) {
          return getValue(key);
        });
      } else if (!item) {
        return getValue();
      } else if (typeof item === "object") {
        var result = {};
        for (var key in item) {
          var val = item[key];
          var type = typeof val;
          if (type === "function") {
            result[key] = item[key](getValue(key));
          } else if (type === "sting") {
            result[key] = getValue(key)[val];
          }
        }
        return result;
      }
    };

    var reset = function reset(item) {
      var options = arguments[1] === undefined ? {} : arguments[1];

      if (item) {
        setValue(item, initial[item]);
      } else {
        removeValue(item);
      }
      if (!options.silent) {
        _this.getter.emit();
      }
    };

    this.set = set;
    this.get = get;
    this.reset = reset;

    this.stateProto = { set: set, get: get, reset: reset, actions: actions };
    this.getter = new Getter(this);
    return this.getter;
  }

  _createClass(Store, {
    addAction: {
      value: function addAction(item) {
        if (Array.isArray(item)) {
          this.actions = this.actions.concat(this.actions);
        } else if (typeof item === "object") {
          this.actions.push(item);
        }
      }
    },
    removeAction: {
      value: function removeAction(item) {
        var action;
        if (typeof item === "string") {
          action = this.findByName("actions", "name", item);
          if (action) action.removeStore(this);
        } else if (typeof item === "object") {
          action = item;
          var index = this.actions.indexOf(action);
          if (index !== -1) {
            action.removeStore(this);
            this.actions = this.actions.splice(index, 1);
          }
        }
      }
    },
    getActionCycle: {
      value: function getActionCycle(actionName) {
        var prefix = arguments[1] === undefined ? "on" : arguments[1];

        var capitalized = utils.capitalize(actionName);
        var fullActionName = "" + prefix + "" + capitalized;
        var handler = this.handlers[fullActionName] || this.handlers[actionName];
        if (!handler) {
          throw new Error("No handlers for " + actionName + " action defined in current store");
        }

        var actions = undefined;
        if (typeof handler === "object") {
          actions = handler;
        } else if (typeof handler === "function") {
          actions = { on: handler };
        } else {
          throw new Error("" + handler + " must be an object or function");
        }
        return actions;
      }
    },
    runCycle: {

      // 1. will(initial) => willResult
      // 2. while(true)
      // 3. on(willResult || initial) => onResult
      // 4. while(false)
      // 5. did(onResult)

      value: function runCycle(actionName) {
        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        // new Promise(resolve => resolve(true))
        var cycle = this.getActionCycle(actionName);
        var promise = Promise.resolve();
        var will = cycle.will,
            while_ = cycle["while"],
            on_ = cycle.on;
        var did = cycle.did,
            didNot = cycle.didNot;

        // Local state for this cycle.
        var state = Object.create(this.stateProto);

        // Pre-check & preparations.
        if (will) promise = promise.then(function () {
          return will.apply(state, args);
        });

        // Start while().
        if (while_) promise = promise.then(function (willResult) {
          while_.call(state, true);
          return willResult;
        });

        // Actual execution.
        promise = promise.then(function (willResult) {
          if (willResult == null) {
            return on_.apply(state, args);
          } else {
            return on_.call(state, willResult);
          }
        });

        // Stop while().
        if (while_) promise = promise.then(function (onResult) {
          while_.call(state, false);
          return onResult;
        });

        // For did and didNot state is freezed.
        promise = promise.then(function (onResult) {
          Object.freeze(state);
          return onResult;
        });

        // Handle the result.
        if (did) promise = promise.then(function (onResult) {
          return did.call(state, onResult);
        });

        promise["catch"](function (error) {
          if (while_) while_.call(state, false);
          if (didNot) {
            didNot.call(state, error);
          } else {
            throw error;
          }
        });

        return promise;
      }
    }
  });

  return Store;
})();

module.exports = Store;

},{"./Actions":2,"./Getter":5,"./utils":10}],7:[function(require,module,exports){
"use strict";

module.exports = {
  allowedGetterProps: ["get", "initial", "actions"]
};

},{}],8:[function(require,module,exports){
"use strict";

module.exports = {
  cx: function cx(classNames) {
    if (typeof classNames == "object") {
      return Object.keys(classNames).filter(function (className) {
        return classNames[className];
      }).join(" ");
    } else {
      return Array.prototype.join.call(arguments, " ");
    }
  }
};

},{}],9:[function(require,module,exports){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

module.exports = getConnectMixin;

var utils = _interopRequire(require("../utils"));

function getConnectMixin(store) {
  for (var _len = arguments.length, key = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    key[_key - 1] = arguments[_key];
  }

  var getStateFromArray = function getStateFromArray(source, array) {
    var state = {};
    array.forEach(function (k) {
      if (typeof k === "string") {
        // connect('itemName')
        state[k] = source.get(k);
      } else if (utils.isObject(k)) {
        Object.keys(k).forEach(function (name) {
          if (typeof k[name] === "function") {
            // connect({data: function (d) {return d.name}})
            state[k] = k[name](source.get(k));
          } else if (typeof k[name] === "string") {
            // connect({nameInStore: nameInComponent})
            state[k[name]] = source.get(name);
          }
        });
      }
    });
    return state;
  };

  var getState = function getState() {
    if (key.length) {
      // get values from arrayl
      return getStateFromArray(store, key);
    } else {
      // get all values
      return store.get();
    }
  };

  var changeCallback = function changeCallback() {
    this.setState(getState());
  };

  return {
    getInitialState: function getInitialState() {
      return getState();
    },

    componentDidMount: function componentDidMount() {
      store.onChange(changeCallback, this);
    },

    componentWillUnmount: function componentWillUnmount() {
      store.offChange(changeCallback);
    }
  };
}

},{"../utils":10}],10:[function(require,module,exports){
"use strict";

var utils = {};

utils.getWithoutFields = function (outcast, target) {
  if (!target) throw new Error("TypeError: target is not an object.");
  var result = {};
  if (typeof outcast === "string") outcast = [outcast];
  var tKeys = Object.keys(target);
  outcast.forEach(function (fieldName) {
    tKeys.filter(function (key) {
      return key !== fieldName;
    }).forEach(function (key) {
      result[key] = target[key];
    });
  });
  return result;
};

utils.objectToArray = function (object) {
  return Object.keys(object).map(function (key) {
    return object[key];
  });
};

utils.classWithArgs = function (Item, args) {
  return Item.bind.apply(Item, [Item].concat(args));
};

// 1. will
// 2. while(true)
// 3. on
// 4. while(false)
// 5. did or didNot
utils.mapActionNames = function (object) {
  var list = [];
  var prefixes = ["will", "whileStart", "on", "whileEnd", "did", "didNot"];
  prefixes.forEach(function (item) {
    var name = item;
    if (item === "whileStart" || item === "whileEnd") {
      name = "while";
    }
    if (object[name]) {
      list.push([item, object[name]]);
    }
  });
  return list;
};

utils.isObject = function (targ) {
  return targ ? targ.toString().slice(8, 14) === "Object" : false;
};
utils.capitalize = function (str) {
  var first = str.charAt(0).toUpperCase();
  var rest = str.slice(1);
  return "" + first + "" + rest;
};

module.exports = utils;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvdXNlci9EZXZlbG9wZXIvY29tL2V4aW0vc3JjL2luZGV4LmpzIiwiL1VzZXJzL3VzZXIvRGV2ZWxvcGVyL2NvbS9leGltL3NyYy9BY3Rpb25zLmpzIiwiL1VzZXJzL3VzZXIvRGV2ZWxvcGVyL2NvbS9leGltL3NyYy9ET01IZWxwZXJzLmpzIiwiL1VzZXJzL3VzZXIvRGV2ZWxvcGVyL2NvbS9leGltL3NyYy9FbWl0dGVyLmpzIiwiL1VzZXJzL3VzZXIvRGV2ZWxvcGVyL2NvbS9leGltL3NyYy9HZXR0ZXIuanMiLCIvVXNlcnMvdXNlci9EZXZlbG9wZXIvY29tL2V4aW0vc3JjL1N0b3JlLmpzIiwiL1VzZXJzL3VzZXIvRGV2ZWxvcGVyL2NvbS9leGltL3NyYy9jb25maWcuanMiLCIvVXNlcnMvdXNlci9EZXZlbG9wZXIvY29tL2V4aW0vc3JjL2hlbHBlcnMuanMiLCIvVXNlcnMvdXNlci9EZXZlbG9wZXIvY29tL2V4aW0vc3JjL21peGlucy9jb25uZWN0LmpzIiwiL1VzZXJzL3VzZXIvRGV2ZWxvcGVyL2NvbS9leGltL3NyYy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7dUJDQThCLFdBQVc7O0lBQWpDLE1BQU0sWUFBTixNQUFNO0lBQUUsT0FBTyxZQUFQLE9BQU87O0lBQ2hCLEtBQUssMkJBQU0sU0FBUzs7SUFDcEIsT0FBTywyQkFBTSxXQUFXOzswQkFDTyxjQUFjOztJQUE1QyxVQUFVLGVBQVYsVUFBVTtJQUFFLE1BQU0sZUFBTixNQUFNO0lBQUUsR0FBRyxlQUFILEdBQUc7O0FBRS9CLElBQU0sSUFBSSxHQUFHLEVBQUMsTUFBTSxFQUFOLE1BQU0sRUFBRSxPQUFPLEVBQVAsT0FBTyxFQUFFLEtBQUssRUFBTCxLQUFLLEVBQUUsTUFBTSxFQUFOLE1BQU0sRUFBRSxHQUFHLEVBQUgsR0FBRyxF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Q0FBQztBQUNILFNBQU8sSUFBSSxDQUFDO0NBQ2IsQ0FBQzs7QUFFRixLQUFLLENBQUMsUUFBUSxHQUFHLFVBQVUsSUFBSSxFQUFFO0FBQy9CLFNBQU8sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxLQUFLLFFBQVEsR0FBRyxLQUFLLENBQUM7Q0FDaEUsQ0FBQztBQUNGLEtBQUssQ0FBQyxVQUFVLEdBQUcsVUFBVSxHQUFHLEVBQUU7QUFDaEMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUMxQyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFCLGNBQVUsS0FBSyxRQUFHLElBQUksQ0FBRztDQUMxQixDQUFDOztpQkFFYSxLQUFLIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCB7QWN0aW9uLCBBY3Rpb25zfSBmcm9tICcuL0FjdGlvbnMnO1xuaW1wb3J0IFN0b3JlIGZyb20gJy4vU3RvcmUnO1xuaW1wb3J0IGhlbHBlcnMgZnJvbSAnLi9oZWxwZXJzJztcbmltcG9ydCB7Y3JlYXRlVmlldywgUm91dGVyLCBET019IGZyb20gJy4vRE9NSGVscGVycyc7XG5cbmNvbnN0IEV4aW0gPSB7QWN0aW9uLCBBY3Rpb25zLCBTdG9yZSwgUm91dGVyLCBET00sIGhlbHBlcnMsIGNyZWF0ZVZpZXd9O1xuXG5FeGltLmNyZWF0ZUFjdGlvbiA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gIHJldHVybiBuZXcgQWN0aW9uKGFyZ3MpO1xufTtcblxuRXhpbS5jcmVhdGVBY3Rpb25zID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgcmV0dXJuIG5ldyBBY3Rpb25zKGFyZ3MpO1xufTtcblxuRXhpbS5jcmVhdGVTdG9yZSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gIHJldHVybiBuZXcgU3RvcmUoYXJncyk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBFeGltO1xuIiwiZXhwb3J0IGNsYXNzIEFjdGlvbiB7XG4gIGNvbnN0cnVjdG9yKGFyZ3MpIHtcbiAgICBjb25zdCBbc3RvcmUsIHN0b3JlcywgYWxsU3RvcmVzXSA9IFthcmdzLnN0b3JlLCBhcmdzLnN0b3JlcywgW11dO1xuICAgIHRoaXMubmFtZSA9IGFyZ3MubmFtZTtcblxuICAgIGlmIChzdG9yZSkgYWxsU3RvcmVzLnB1c2goc3RvcmUpO1xuICAgIGlmIChzdG9yZXMpIGFsbFN0b3Jlcy5wdXNoLmFwcGx5KGFsbFN0b3Jlcywgc3RvcmVzKTtcblxuICAgIHRoaXMuc3RvcmVzID0gYWxsU3RvcmVzO1xuICB9XG5cbiAgcnVuKC4uLmFyZ3MpIHtcbiAgICBjb25zdCBzdG9yZXNDeWNsZXMgPSB0aGlzLnN0b3Jlcy5tYXAoc3RvcmUgPT5cbiAgICAgIHN0b3JlLnJ1bkN5Y2xlLmFwcGx5KHN0b3JlLCBbdGhpcy5uYW1lXS5jb25jYXQoYXJncykpXG4gICAgKTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoc3RvcmVzQ3ljbGVzKTtcbiAgfVxuXG4gIGFkZFN0b3JlKHN0b3JlKSB7XG4gICAgdGhpcy5zdG9yZXMucHVzaChzdG9yZSk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEFjdGlvbnMge1xuICBjb25zdHJ1Y3RvcihhY3Rpb25zKSB7XG4gICAgdGhpcy5hbGwgPSBbXTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShhY3Rpb25zKSkge1xuICAgICAgYWN0aW9ucy5mb3JFYWNoKChhY3Rpb24gPT4gdGhpcy5hZGRBY3Rpb24oYWN0aW9uKSksIHRoaXMpO1xuICAgIH1cbiAgfVxuXG4gIGFkZEFjdGlvbihpdGVtLCBub092ZXJyaWRlKSB7XG4gICAgY29uc3QgYWN0aW9uID0gbm9PdmVycmlkZSA/IGZhbHNlIDogdGhpcy5kZXRlY3RBY3Rpb24oaXRlbSk7XG4gICAgaWYgKCFub092ZXJyaWRlKSB7XG4gICAgICBsZXQgb2xkID0gdGhpc1thY3Rpb24ubmFtZV07XG4gICAgICBpZiAob2xkKSB0aGlzLnJlbW92ZUFjdGlvbihvbGQpO1xuICAgICAgdGhpcy5hbGwucHVzaChhY3Rpb24pO1xuICAgICAgdGhpc1thY3Rpb24ubmFtZV0gPSBhY3Rpb24ucnVuLmJpbmQoYWN0aW9uKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYWN0aW9uO1xuICB9XG5cbiAgcmVtb3ZlQWN0aW9uKGl0ZW0pIHtcbiAgICBjb25zdCBhY3Rpb24gPSB0aGlzLmRldGVjdEFjdGlvbihpdGVtLCB0cnVlKTtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMuYWxsLmluZGV4T2YoYWN0aW9uKTtcbiAgICBpZiAoaW5kZXggIT09IC0xKSB0aGlzLmFsbC5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIGRlbGV0ZSB0aGlzW2FjdGlvbi5uYW1lXTtcbiAgfVxuXG4gIGFkZFN0b3JlKHN0b3JlKSB7XG4gICAgdGhpcy5hbGwuZm9yRWFjaChhY3Rpb24gPT4gYWN0aW9uLmFkZFN0b3JlKHN0b3JlKSk7XG4gIH1cblxuICBkZXRlY3RBY3Rpb24oYWN0aW9uLCBpc09sZCkge1xuICAgIGlmIChhY3Rpb24uY29uc3RydWN0b3IgPT09IEFjdGlvbikge1xuICAgICAgcmV0dXJuIGFjdGlvbjtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhY3Rpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gKGlzT2xkKSA/IHRoaXNbYWN0aW9uXSA6IG5ldyBBY3Rpb24oe25hbWU6IGFjdGlvbn0pO1xuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCBSZWFjdFJvdXRlciBmcm9tICdyZWFjdC1yb3V0ZXInO1xuXG5mdW5jdGlvbiBnZXRSb3V0ZXIgKCkge1xuICBjb25zdCBSb3V0ZXIgPSB7fTtcbiAgaWYgKHR5cGVvZiBSZWFjdFJvdXRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBsZXQgcm91dGVyRWxlbWVudHMgPSBbJ1JvdXRlJywgJ0RlZmF1bHRSb3V0ZScsICdSb3V0ZUhhbmRsZXInLCAnQWN0aXZlSGFuZGxlcicsICdOb3RGb3VuZFJvdXRlJywgJ0xpbmsnLCAnUmVkaXJlY3QnXSxcbiAgICByb3V0ZXJNaXhpbnMgPSBbJ05hdmlnYXRpb24nLCAnU3RhdGUnXSxcbiAgICByb3V0ZXJGdW5jdGlvbnMgPSBbJ2NyZWF0ZScsICdjcmVhdGVEZWZhdWx0Um91dGUnLCAnY3JlYXRlTm90Rm91bmRSb3V0ZScsICdjcmVhdGVSZWRpcmVjdCcsICdjcmVhdGVSb3V0ZScsICdjcmVhdGVSb3V0ZXNGcm9tUmVhY3RDaGlsZHJlbicsICdydW4nXSxcbiAgICByb3V0ZXJPYmplY3RzID0gWydIYXNoTG9jYXRpb24nLCAnSGlzdG9yeScsICdIaXN0b3J5TG9jYXRpb24nLCAnUmVmcmVzaExvY2F0aW9uJywgJ1N0YXRpY0xvY2F0aW9uJywgJ1Rlc3RMb2NhdGlvbicsICdJbWl0YXRlQnJvd3NlckJlaGF2aW9yJywgJ1Njcm9sbFRvVG9wQmVoYXZpb3InXSxcbiAgICBjb3BpZWRJdGVtcyA9IHJvdXRlck1peGlucy5jb25jYXQocm91dGVyRnVuY3Rpb25zKS5jb25jYXQocm91dGVyT2JqZWN0cyk7XG5cbiAgICByb3V0ZXJFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIFJvdXRlcltuYW1lXSA9IFJlYWN0LmNyZWF0ZUVsZW1lbnQuYmluZChSZWFjdCwgUmVhY3RSb3V0ZXJbbmFtZV0pO1xuICAgIH0pO1xuXG4gICAgY29waWVkSXRlbXMuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICBSb3V0ZXJbbmFtZV0gPSBSZWFjdFJvdXRlcltuYW1lXTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gUm91dGVyO1xufVxuXG5mdW5jdGlvbiBnZXRET00gKCkge1xuICBjb25zdCBET01IZWxwZXJzID0ge307XG5cbiAgaWYgKHR5cGVvZiBSZWFjdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBsZXQgdGFnID0gZnVuY3Rpb24gKG5hbWUsIC4uLmFyZ3MpIHtcbiAgICAgIGxldCBhdHRyaWJ1dGVzO1xuICAgICAgbGV0IGZpcnN0ID0gYXJnc1swXSAmJiBhcmdzWzBdLmNvbnN0cnVjdG9yO1xuICAgICAgaWYgKGZpcnN0ID09PSBPYmplY3QpIHtcbiAgICAgICAgYXR0cmlidXRlcyA9IGFyZ3Muc2hpZnQoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF0dHJpYnV0ZXMgPSB7fTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBSZWFjdC5ET01bbmFtZV0uYXBwbHkoUmVhY3QuRE9NLCBbYXR0cmlidXRlc10uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuXG4gICAgZm9yIChsZXQgdGFnTmFtZSBpbiBSZWFjdC5ET00pIHtcbiAgICAgIERPTUhlbHBlcnNbdGFnTmFtZV0gPSB0YWcuYmluZCh0aGlzLCB0YWdOYW1lKTtcbiAgICB9XG5cbiAgICBET01IZWxwZXJzLnNwYWNlID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gUmVhY3QuRE9NLnNwYW4oe1xuICAgICAgICBkYW5nZXJvdXNseVNldElubmVySFRNTDoge1xuICAgICAgICAgIF9faHRtbDogJyZuYnNwOydcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gRE9NSGVscGVycztcbn1cblxuZXhwb3J0IGNvbnN0IFJvdXRlciA9IGdldFJvdXRlcigpO1xuZXhwb3J0IGNvbnN0IERPTSA9IGdldERPTSgpO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVmlldyAoY2xhc3NBcmdzKSB7XG4gIGxldCBSZWFjdENsYXNzID0gUmVhY3QuY3JlYXRlQ2xhc3MoY2xhc3NBcmdzKTtcbiAgbGV0IFJlYWN0RWxlbWVudCA9IFJlYWN0LmNyZWF0ZUVsZW1lbnQuYmluZChSZWFjdC5jcmVhdGVFbGVtZW50LCBSZWFjdENsYXNzKTtcbiAgcmV0dXJuIFJlYWN0RWxlbWVudDtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5fbGlzdGVuZXJzID0gW107XG4gIH1cblxuICBmaW5kTGlzdGVuZXJJbmRleChsaXN0ZW5lcikge1xuICAgIHJldHVybiB0aGlzLl9saXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcik7XG4gIH1cblxuICBfYWRkTGlzdGVuZXIobGlzdGVuZXIsIGNvbnRleHQpIHtcbiAgICBsZXQgZm91bmQgPSB0aGlzLmZpbmRMaXN0ZW5lckluZGV4KGxpc3RlbmVyKSA+PSAwO1xuICAgIGlmICghZm91bmQpIHtcbiAgICAgIGlmIChjb250ZXh0KSBsaXN0ZW5lci5fY3R4ID0gY29udGV4dDtcbiAgICAgIHRoaXMuX2xpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBfcmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpIHtcbiAgICBsZXQgaW5kZXgsIGZvdW5kID0gKGluZGV4ID0gdGhpcy5maW5kTGlzdGVuZXJJbmRleChsaXN0ZW5lcikpID49IDA7XG4gICAgaWYgKGZvdW5kKSB7XG4gICAgICB0aGlzLl9saXN0ZW5lcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBlbWl0KCkge1xuICAgIHRoaXMuX2xpc3RlbmVycy5mb3JFYWNoKGxpc3RlbmVyID0+IGxpc3RlbmVyLl9jdHggPyBsaXN0ZW5lci5jYWxsKGxpc3RlbmVyLl9jdHgpIDogbGlzdGVuZXIoKSk7XG4gIH1cbn1cbiIsImltcG9ydCBFbWl0dGVyIGZyb20gJy4vRW1pdHRlcic7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBnZXRDb25uZWN0TWl4aW4gZnJvbSAnLi9taXhpbnMvY29ubmVjdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdldHRlciBleHRlbmRzIEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihzdG9yZSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICAvLyBDb3B5IGFsbG93ZWQgcHJvcHMgdG8gZ2V0dGVyLlxuICAgIGNvbmZpZy5hbGxvd2VkR2V0dGVyUHJvcHMuZm9yRWFjaChwcm9wID0+IHRoaXNbcHJvcF0gPSBzdG9yZVtwcm9wXSk7XG5cbiAgICAvLyBDb25zaXN0ZW50IG5hbWVzIGZvciBlbWl0dGVyIG1ldGhvZHMuXG4gICAgW3RoaXMub25DaGFuZ2UsIHRoaXMub2ZmQ2hhbmdlXSA9IFt0aGlzLl9hZGRMaXN0ZW5lciwgdGhpcy5fcmVtb3ZlTGlzdGVuZXJdO1xuXG4gICAgLy8gQ29ubmVjdCBtaXhpbiBiaW5kZWQgdG8gZ2V0dGVyLlxuICAgIHRoaXMuY29ubmVjdCA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICByZXR1cm4gZ2V0Q29ubmVjdE1peGluLmFwcGx5KG51bGwsIFt0aGlzXS5jb25jYXQoYXJncykpO1xuICAgIH07XG4gIH1cbn1cbiIsImltcG9ydCB7QWN0aW9uc30gZnJvbSAnLi9BY3Rpb25zJztcbmltcG9ydCBHZXR0ZXIgZnJvbSAnLi9HZXR0ZXInO1xuaW1wb3J0IHV0aWxzIGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTdG9yZSB7XG4gIGNvbnN0cnVjdG9yKGFyZ3M9e30pIHtcbiAgICBsZXQge2FjdGlvbnMsIGluaXRpYWx9ID0gYXJncztcbiAgICB0aGlzLmluaXRpYWwgPSBpbml0aWFsID0gdHlwZW9mIGluaXRpYWwgPT09ICdmdW5jdGlvbicgPyBpbml0aWFsKCkgOiBpbml0aWFsO1xuICAgIGNvbnN0IHN0b3JlID0gaW5pdGlhbCA/IE9iamVjdC5hc3NpZ24oaW5pdGlhbCkgOiB7fTtcblxuICAgIGxldCBwcml2YXRlTWV0aG9kcztcbiAgICBpZiAoIWFyZ3MucHJpdmF0ZU1ldGhvZHMpIHtcbiAgICAgIHByaXZhdGVNZXRob2RzID0gbmV3IFNldCgpO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShhcmdzLnByaXZhdGVNZXRob2RzKSkge1xuICAgICAgcHJpdmF0ZU1ldGhvZHMgPSBuZXcgU2V0KCk7XG4gICAgICAvLyBwcml2YXRlIHNldCBpcyB1bmRlZmluZWRcbiAgICAgIC8vIGFyZ3MucHJpdmF0ZU1ldGhvZHMuZm9yRWFjaChtID0+IHByaXZhdGVTZXQuYWRkKG0pKTtcbiAgICAgIC8vIGFyZ3MucHJpdmF0ZU1ldGhvZHMgPSBwcml2YXRlU2V0O1xuICAgIH0gZWxzZSBpZiAoYXJncy5wcml2YXRlTWV0aG9kcy5jb25zdHJ1Y3RvciA9PT0gU2V0KSB7XG4gICAgICBwcml2YXRlTWV0aG9kcyA9IGFyZ3MucHJpdmF0ZU1ldGhvZHM7XG4gICAgfVxuICAgIHRoaXMucHJpdmF0ZU1ldGhvZHMgPSBwcml2YXRlTWV0aG9kcztcblxuICAgIHRoaXMuaGFuZGxlcnMgPSBhcmdzLmhhbmRsZXJzIHx8IHV0aWxzLmdldFdpdGhvdXRGaWVsZHMoWydhY3Rpb25zJ10sIGFyZ3MpIHx8IHt9O1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYWN0aW9ucykpIHtcbiAgICAgIHRoaXMuYWN0aW9ucyA9IGFjdGlvbnMgPSBuZXcgQWN0aW9ucyhhY3Rpb25zKTtcbiAgICAgIHRoaXMuYWN0aW9ucy5hZGRTdG9yZSh0aGlzKTtcbiAgICB9XG5cbiAgICBsZXQgX3RoaXMgPSB0aGlzO1xuXG4gICAgY29uc3Qgc2V0VmFsdWUgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgc3RvcmVba2V5XSA9IHZhbHVlO1xuICAgIH07XG5cbiAgICBjb25zdCBnZXRWYWx1ZSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKFxuICAgICAgICAoa2V5ID8gc3RvcmVba2V5XSA6IHN0b3JlKVxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgY29uc3QgcmVtb3ZlVmFsdWUgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICBsZXQgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIHN0b3JlKSB7XG4gICAgICAgICAgc3RvcmVba2V5XSA9IGluaXRpYWxba2V5XTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RvcmVba2V5XSA9IGluaXRpYWxba2V5XTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdWNjZXNzO1xuICAgIH07XG5cbiAgICBjb25zdCBzZXQgPSBmdW5jdGlvbiAoaXRlbSwgdmFsdWUsIG9wdGlvbnM9e30pIHtcbiAgICAgIGlmICh1dGlscy5pc09iamVjdChpdGVtKSkge1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gaXRlbSkge1xuICAgICAgICAgIHNldFZhbHVlKGtleSwgaXRlbVtrZXldLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0VmFsdWUoaXRlbSwgdmFsdWUsIG9wdGlvbnMpO1xuICAgICAgfVxuICAgICAgaWYgKCFvcHRpb25zLnNpbGVudCkge1xuICAgICAgICBfdGhpcy5nZXR0ZXIuZW1pdCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBnZXQgPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgaXRlbSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcmV0dXJuIGdldFZhbHVlKGl0ZW0pO1xuICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICAgIHJldHVybiBpdGVtLm1hcChrZXkgPT4gZ2V0VmFsdWUoa2V5KSk7XG4gICAgICB9IGVsc2UgaWYgKCFpdGVtKSB7XG4gICAgICAgIHJldHVybiBnZXRWYWx1ZSgpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IHt9O1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gaXRlbSkge1xuICAgICAgICAgIGxldCB2YWwgPSBpdGVtW2tleV07XG4gICAgICAgICAgbGV0IHR5cGUgPSB0eXBlb2YgdmFsO1xuICAgICAgICAgIGlmICh0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXN1bHRba2V5XSA9IGl0ZW1ba2V5XShnZXRWYWx1ZShrZXkpKTtcbiAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RpbmcnKSB7XG4gICAgICAgICAgICByZXN1bHRba2V5XSA9IGdldFZhbHVlKGtleSlbdmFsXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgcmVzZXQgPSBmdW5jdGlvbiAoaXRlbSwgb3B0aW9ucz17fSkge1xuICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgc2V0VmFsdWUoaXRlbSwgaW5pdGlhbFtpdGVtXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZW1vdmVWYWx1ZShpdGVtKTtcbiAgICAgIH1cbiAgICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgICAgX3RoaXMuZ2V0dGVyLmVtaXQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5zZXQgPSBzZXQ7XG4gICAgdGhpcy5nZXQgPSBnZXQ7XG4gICAgdGhpcy5yZXNldCA9IHJlc2V0O1xuXG4gICAgdGhpcy5zdGF0ZVByb3RvID0ge3NldCwgZ2V0LCByZXNldCwgYWN0aW9uc307XG4gICAgdGhpcy5nZXR0ZXIgPSBuZXcgR2V0dGVyKHRoaXMpO1xuICAgIHJldHVybiB0aGlzLmdldHRlcjtcbiAgfVxuXG4gIGFkZEFjdGlvbihpdGVtKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoaXRlbSkpIHtcbiAgICAgIHRoaXMuYWN0aW9ucyA9IHRoaXMuYWN0aW9ucy5jb25jYXQodGhpcy5hY3Rpb25zKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0Jykge1xuICAgICAgdGhpcy5hY3Rpb25zLnB1c2goaXRlbSk7XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlQWN0aW9uKGl0ZW0pIHtcbiAgICB2YXIgYWN0aW9uO1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGFjdGlvbiA9IHRoaXMuZmluZEJ5TmFtZSgnYWN0aW9ucycsICduYW1lJywgaXRlbSk7XG4gICAgICBpZiAoYWN0aW9uKSBhY3Rpb24ucmVtb3ZlU3RvcmUodGhpcyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGFjdGlvbiA9IGl0ZW07XG4gICAgICBsZXQgaW5kZXggPSB0aGlzLmFjdGlvbnMuaW5kZXhPZihhY3Rpb24pO1xuICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICBhY3Rpb24ucmVtb3ZlU3RvcmUodGhpcyk7XG4gICAgICAgIHRoaXMuYWN0aW9ucyA9IHRoaXMuYWN0aW9ucy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldEFjdGlvbkN5Y2xlKGFjdGlvbk5hbWUsIHByZWZpeD0nb24nKSB7XG4gICAgY29uc3QgY2FwaXRhbGl6ZWQgPSB1dGlscy5jYXBpdGFsaXplKGFjdGlvbk5hbWUpO1xuICAgIGNvbnN0IGZ1bGxBY3Rpb25OYW1lID0gYCR7cHJlZml4fSR7Y2FwaXRhbGl6ZWR9YDtcbiAgICBjb25zdCBoYW5kbGVyID0gdGhpcy5oYW5kbGVyc1tmdWxsQWN0aW9uTmFtZV0gfHwgdGhpcy5oYW5kbGVyc1thY3Rpb25OYW1lXTtcbiAgICBpZiAoIWhhbmRsZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gaGFuZGxlcnMgZm9yICR7YWN0aW9uTmFtZX0gYWN0aW9uIGRlZmluZWQgaW4gY3VycmVudCBzdG9yZWApO1xuICAgIH1cblxuICAgIGxldCBhY3Rpb25zO1xuICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGFjdGlvbnMgPSBoYW5kbGVyO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGFjdGlvbnMgPSB7b246IGhhbmRsZXJ9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7aGFuZGxlcn0gbXVzdCBiZSBhbiBvYmplY3Qgb3IgZnVuY3Rpb25gKTtcbiAgICB9XG4gICAgcmV0dXJuIGFjdGlvbnM7XG4gIH1cblxuICAvLyAxLiB3aWxsKGluaXRpYWwpID0+IHdpbGxSZXN1bHRcbiAgLy8gMi4gd2hpbGUodHJ1ZSlcbiAgLy8gMy4gb24od2lsbFJlc3VsdCB8fCBpbml0aWFsKSA9PiBvblJlc3VsdFxuICAvLyA0LiB3aGlsZShmYWxzZSlcbiAgLy8gNS4gZGlkKG9uUmVzdWx0KVxuICBydW5DeWNsZShhY3Rpb25OYW1lLCAuLi5hcmdzKSB7XG4gICAgLy8gbmV3IFByb21pc2UocmVzb2x2ZSA9PiByZXNvbHZlKHRydWUpKVxuICAgIGNvbnN0IGN5Y2xlID0gdGhpcy5nZXRBY3Rpb25DeWNsZShhY3Rpb25OYW1lKTtcbiAgICBsZXQgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIGxldCB3aWxsID0gY3ljbGUud2lsbCwgd2hpbGVfID0gY3ljbGUud2hpbGUsIG9uXyA9IGN5Y2xlLm9uO1xuICAgIGxldCBkaWQgPSBjeWNsZS5kaWQsIGRpZE5vdCA9IGN5Y2xlLmRpZE5vdDtcblxuICAgIC8vIExvY2FsIHN0YXRlIGZvciB0aGlzIGN5Y2xlLlxuICAgIGxldCBzdGF0ZSA9IE9iamVjdC5jcmVhdGUodGhpcy5zdGF0ZVByb3RvKTtcblxuICAgIC8vIFByZS1jaGVjayAmIHByZXBhcmF0aW9ucy5cbiAgICBpZiAod2lsbCkgcHJvbWlzZSA9IHByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICByZXR1cm4gd2lsbC5hcHBseShzdGF0ZSwgYXJncyk7XG4gICAgfSk7XG5cbiAgICAvLyBTdGFydCB3aGlsZSgpLlxuICAgIGlmICh3aGlsZV8pIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKHdpbGxSZXN1bHQpID0+IHtcbiAgICAgIHdoaWxlXy5jYWxsKHN0YXRlLCB0cnVlKTtcbiAgICAgIHJldHVybiB3aWxsUmVzdWx0O1xuICAgIH0pO1xuXG4gICAgLy8gQWN0dWFsIGV4ZWN1dGlvbi5cbiAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKCh3aWxsUmVzdWx0KSA9PiB7XG4gICAgICBpZiAod2lsbFJlc3VsdCA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBvbl8uYXBwbHkoc3RhdGUsIGFyZ3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9uXy5jYWxsKHN0YXRlLCB3aWxsUmVzdWx0KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFN0b3Agd2hpbGUoKS5cbiAgICBpZiAod2hpbGVfKSBwcm9taXNlID0gcHJvbWlzZS50aGVuKChvblJlc3VsdCkgPT4ge1xuICAgICAgd2hpbGVfLmNhbGwoc3RhdGUsIGZhbHNlKTtcbiAgICAgIHJldHVybiBvblJlc3VsdDtcbiAgICB9KTtcblxuICAgIC8vIEZvciBkaWQgYW5kIGRpZE5vdCBzdGF0ZSBpcyBmcmVlemVkLlxuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKG9uUmVzdWx0KSA9PiB7XG4gICAgICBPYmplY3QuZnJlZXplKHN0YXRlKTtcbiAgICAgIHJldHVybiBvblJlc3VsdDtcbiAgICB9KTtcblxuICAgIC8vIEhhbmRsZSB0aGUgcmVzdWx0LlxuICAgIGlmIChkaWQpIHByb21pc2UgPSBwcm9taXNlLnRoZW4ob25SZXN1bHQgPT4ge1xuICAgICAgcmV0dXJuIGRpZC5jYWxsKHN0YXRlLCBvblJlc3VsdCk7XG4gICAgfSk7XG5cbiAgICBwcm9taXNlLmNhdGNoKGVycm9yID0+IHtcbiAgICAgIGlmICh3aGlsZV8pIHdoaWxlXy5jYWxsKHN0YXRlLCBmYWxzZSk7XG4gICAgICBpZiAoZGlkTm90KSB7XG4gICAgICAgIGRpZE5vdC5jYWxsKHN0YXRlLCBlcnJvcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG59XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIGFsbG93ZWRHZXR0ZXJQcm9wczogWydnZXQnLCAnaW5pdGlhbCcsICdhY3Rpb25zJ11cbn07XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIGN4OiBmdW5jdGlvbiAoY2xhc3NOYW1lcykge1xuICAgIGlmICh0eXBlb2YgY2xhc3NOYW1lcyA9PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGNsYXNzTmFtZXMpLmZpbHRlcihmdW5jdGlvbihjbGFzc05hbWUpIHtcbiAgICAgICAgcmV0dXJuIGNsYXNzTmFtZXNbY2xhc3NOYW1lXTtcbiAgICAgIH0pLmpvaW4oJyAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5qb2luLmNhbGwoYXJndW1lbnRzLCAnICcpO1xuICAgIH1cbiAgfVxufTtcbiIsImltcG9ydCB1dGlscyBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdldENvbm5lY3RNaXhpbiAoc3RvcmUsIC4uLmtleSkge1xuICBsZXQgZ2V0U3RhdGVGcm9tQXJyYXkgPSBmdW5jdGlvbiAoc291cmNlLCBhcnJheSkge1xuICAgIGxldCBzdGF0ZSA9IHt9O1xuICAgIGFycmF5LmZvckVhY2goayA9PiB7XG4gICAgICBpZiAodHlwZW9mIGsgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIC8vIGNvbm5lY3QoJ2l0ZW1OYW1lJylcbiAgICAgICAgc3RhdGVba10gPSBzb3VyY2UuZ2V0KGspO1xuICAgICAgfSBlbHNlIGlmICh1dGlscy5pc09iamVjdChrKSkge1xuICAgICAgICBPYmplY3Qua2V5cyhrKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICAgIGlmICh0eXBlb2Yga1tuYW1lXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgLy8gY29ubmVjdCh7ZGF0YTogZnVuY3Rpb24gKGQpIHtyZXR1cm4gZC5uYW1lfX0pXG4gICAgICAgICAgICBzdGF0ZVtrXSA9IGtbbmFtZV0oc291cmNlLmdldChrKSk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Yga1tuYW1lXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIC8vIGNvbm5lY3Qoe25hbWVJblN0b3JlOiBuYW1lSW5Db21wb25lbnR9KVxuICAgICAgICAgICAgc3RhdGVba1tuYW1lXV0gPSBzb3VyY2UuZ2V0KG5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHN0YXRlO1xuICB9O1xuXG4gIGxldCBnZXRTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoa2V5Lmxlbmd0aCkge1xuICAgICAgICAvLyBnZXQgdmFsdWVzIGZyb20gYXJyYXlsXG4gICAgICByZXR1cm4gZ2V0U3RhdGVGcm9tQXJyYXkoc3RvcmUsIGtleSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGdldCBhbGwgdmFsdWVzXG4gICAgICByZXR1cm4gc3RvcmUuZ2V0KCk7XG4gICAgfVxuICB9O1xuXG4gIGxldCBjaGFuZ2VDYWxsYmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldFN0YXRlKGdldFN0YXRlKCkpO1xuICB9O1xuXG4gIHJldHVybiB7XG4gICAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gZ2V0U3RhdGUoKTtcbiAgICB9LFxuXG4gICAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHN0b3JlLm9uQ2hhbmdlKGNoYW5nZUNhbGxiYWNrLCB0aGlzKTtcbiAgICB9LFxuXG4gICAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHN0b3JlLm9mZkNoYW5nZShjaGFuZ2VDYWxsYmFjayk7XG4gICAgfVxuICB9O1xufVxuIiwiY29uc3QgdXRpbHMgPSB7fTtcblxudXRpbHMuZ2V0V2l0aG91dEZpZWxkcyA9IGZ1bmN0aW9uIChvdXRjYXN0LCB0YXJnZXQpIHtcbiAgaWYgKCF0YXJnZXQpIHRocm93IG5ldyBFcnJvcignVHlwZUVycm9yOiB0YXJnZXQgaXMgbm90IGFuIG9iamVjdC4nKTtcbiAgdmFyIHJlc3VsdCA9IHt9O1xuICBpZiAodHlwZW9mIG91dGNhc3QgPT09ICdzdHJpbmcnKSBvdXRjYXN0ID0gW291dGNhc3RdO1xuICB2YXIgdEtleXMgPSBPYmplY3Qua2V5cyh0YXJnZXQpO1xuICBvdXRjYXN0LmZvckVhY2goZnVuY3Rpb24oZmllbGROYW1lKSB7XG4gICAgdEtleXNcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHJldHVybiBrZXkgIT09IGZpZWxkTmFtZTtcbiAgICAgIH0pXG4gICAgICAuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB0YXJnZXRba2V5XTtcbiAgICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbnV0aWxzLm9iamVjdFRvQXJyYXkgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhvYmplY3QpLm1hcChrZXkgPT4gb2JqZWN0W2tleV0pO1xufTtcblxudXRpbHMuY2xhc3NXaXRoQXJncyA9IGZ1bmN0aW9uIChJdGVtLCBhcmdzKSB7XG4gIHJldHVybiBJdGVtLmJpbmQuYXBwbHkoSXRlbSxbSXRlbV0uY29uY2F0KGFyZ3MpKTtcbn07XG5cbi8vIDEuIHdpbGxcbi8vIDIuIHdoaWxlKHRydWUpXG4vLyAzLiBvblxuLy8gNC4gd2hpbGUoZmFsc2UpXG4vLyA1LiBkaWQgb3IgZGlkTm90XG51dGlscy5tYXBBY3Rpb25OYW1lcyA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICBjb25zdCBsaXN0ID0gW107XG4gIGNvbnN0IHByZWZpeGVzID0gWyd3aWxsJywgJ3doaWxlU3RhcnQnLCAnb24nLCAnd2hpbGVFbmQnLCAnZGlkJywgJ2RpZE5vdCddO1xuICBwcmVmaXhlcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgIGxldCBuYW1lID0gaXRlbTtcbiAgICBpZiAoaXRlbSA9PT0gJ3doaWxlU3RhcnQnIHx8IGl0ZW0gPT09ICd3aGlsZUVuZCcpIHtcbiAgICAgIG5hbWUgPSAnd2hpbGUnO1xuICAgIH1cbiAgICBpZiAob2JqZWN0W25hbWVdKSB7XG4gICAgICBsaXN0LnB1c2goW2l0ZW0sIG9iamVjdFtuYW1lXV0pO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBsaXN0O1xufTtcblxudXRpbHMuaXNPYmplY3QgPSBmdW5jdGlvbiAodGFyZykge1xuICByZXR1cm4gdGFyZyA/IHRhcmcudG9TdHJpbmcoKS5zbGljZSg4LDE0KSA9PT0gJ09iamVjdCcgOiBmYWxzZTtcbn07XG51dGlscy5jYXBpdGFsaXplID0gZnVuY3Rpb24gKHN0cikge1xuICBjb25zdCBmaXJzdCA9IHN0ci5jaGFyQXQoMCkudG9VcHBlckNhc2UoKTtcbiAgY29uc3QgcmVzdCA9IHN0ci5zbGljZSgxKTtcbiAgcmV0dXJuIGAke2ZpcnN0fSR7cmVzdH1gO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgdXRpbHM7XG4iXX0=
