(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _Actions = require("./Actions");

var Action = _Actions.Action;
var Actions = _Actions.Actions;

var Store = _interopRequire(require("./Store"));

var helpers = _interopRequire(require("./helpers"));

var Getter = _interopRequire(require("./Getter"));

var GlobalStore = _interopRequire(require("./GlobalStore"));

var _DOMHelpers = require("./DOMHelpers");

var createView = _DOMHelpers.createView;
var getRouter = _DOMHelpers.getRouter;
var Router = _DOMHelpers.Router;
var DOM = _DOMHelpers.DOM;

var Exim = { Action: Action, Actions: Actions, Store: Store, Router: Router, DOM: DOM, helpers: helpers, createView: createView, getRouter: getRouter };

Exim.createAction = function (args) {
  return new Action(args);
};

Exim.createActions = function (args) {
  return new Actions(args);
};

Exim.createStore = function (args) {
  return new Store(args);
};

Exim.listen = function (args) {
  var stores = {};
  args.forEach(function (path) {
    var pathBits = path.split("/");
    var pathLength = pathBits.length;

    if (pathLength > 1) {
      var storePath = pathBits.slice(0, pathLength - 1).join("/");
      var tPath = pathBits.slice(pathLength - 1)[0];

      stores[storePath] = Array.isArray(stores[storePath]) ? stores[storePath].concat(tPath) : [tPath];
    }
  });

  var mixins = [];
  Object.keys(stores).forEach(function (path) {
    var store = GlobalStore.findStore(path);
    mixins.push(store._getter.connect.apply(store._getter, stores[path]));
  });

  return mixins;
};

Exim.stores = GlobalStore.getStore();

var root = typeof self === "object" && self.self === self && self || typeof global === "object" && global.global === global && global;

if (typeof root.exports !== "undefined") {
  if (typeof module !== "undefined" && module.exports) {
    exports = module.exports = Exim;
  }
  exports.Exim = Exim;
} else {
  root.Exim = Exim;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Actions":2,"./DOMHelpers":3,"./Getter":5,"./GlobalStore":6,"./Store":7,"./helpers":9}],2:[function(require,module,exports){
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
    // return this.getter = {};
  }

  _createClass(Actions, {
    addAction: {
      value: function addAction(item, noOverride) {
        var action = noOverride ? false : this.detectAction(item);
        if (!noOverride) {
          var old = undefined;
          if (old = this[action.name]) this.removeAction(old);
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
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var utils = _interopRequire(require("./utils"));

var helpers = _interopRequire(require("./helpers"));

var getFilePath = function getFilePath(name) {
  var segments = name.split("-");
  var filePath = undefined;
  if (segments.length > 1) {
    filePath = segments.map(function (name, i) {
      if (i > 0) return name.charAt(0).toUpperCase() + name.slice(1);
      return name;
    }).join("/");
  } else {
    filePath = name + "/" + name.charAt(0).toUpperCase() + name.slice(1);
  }
  return filePath;
};

var getRouter = function getRouter() {
  var Router = {};

  if (typeof ReactRouter !== "undefined") {
    var routerComponents = undefined,
        routerMixins = undefined,
        routerFunctions = undefined,
        routerObjects = undefined,
        copiedItems = undefined;
    var ReactRouter1 = !ReactRouter.DefaultRoute;

    if (ReactRouter1) {
      routerComponents = ["Router", "Link", "IndexLink", "RoutingContext", "Route", "Redirect", "IndexRoute", "IndexRedirect"];
      routerMixins = ["Lifecycle", "History", "RouteContext"];
      routerFunctions = ["createRoutes", "useRoutes", "match", "default"];
      routerObjects = ["PropTypes"];
    } else {
      routerComponents = ["Route", "DefaultRoute", "RouteHandler", "ActiveHandler", "NotFoundRoute", "Redirect"];
      routerMixins = ["Navigation", "State"];
      routerFunctions = ["create", "createDefaultRoute", "createNotFoundRoute", "createRedirect", "createRoute", "createRoutesFromReactChildren", "run"];
      routerObjects = ["HashLocation", "History", "HistoryLocation", "RefreshLocation", "StaticLocation", "TestLocation", "ImitateBrowserBehavior", "ScrollToTopBehavior"];
    }

    copiedItems = routerMixins.concat(routerFunctions).concat(routerObjects);

    routerComponents.forEach(function (name) {
      Router[name] = React.createElement.bind(React, ReactRouter[name]);
    });

    copiedItems.forEach(function (name) {
      Router[name] = ReactRouter[name];
    });

    Router.Link = function (args, children) {
      if ("class" in args) {
        args.className = args["class"];
        delete args["class"];
      }
      return React.createElement(ReactRouter.Link, args, children);
    };

    if (!ReactRouter1) {
      Router.match = function (name, handler, args, children) {
        if (typeof args === "undefined" && Array.isArray(handler)) {
          children = handler;
          args = {};
          handler = Router.mount(getFilePath(name));
        } else if (typeof args === "undefined" && typeof handler === "object") {
          args = handler;
          handler = Router.mount(getFilePath(name));
        } else if (typeof handler === "object" && Array.isArray(args)) {
          children = args;
          args = handler;
          handler = Router.mount(getFilePath(name));
        }
        var path = undefined,
            key = undefined,
            def = undefined;

        if (typeof args === "object") {
          path = args.path;
          key = args.key;
          def = args["default"];
        }

        if (def === true) {
          return Router.DefaultRoute({ name: name, path: path, handler: handler, key: key }, children);
        }

        return Router.Route({ name: name, path: path, handler: handler, key: key }, children);
      };
    }
  }

  return Router;
};

exports.getRouter = getRouter;
var getDOM = function getDOM() {
  var DOMHelpers = {};

  if (typeof React !== "undefined") {
    (function () {
      var tag = function tag(name) {
        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        var attributes = undefined;
        var first = args[0] && args[0].constructor;
        if (first === Object) {
          attributes = args.shift();
          if (attributes["class"] != null) {
            attributes.className = attributes["class"];
          }
          if (typeof attributes.className === "object") {
            attributes.className = helpers.cx(attributes.className);
          }
        } else {
          attributes = {};
        }
        return React.DOM[name].apply(React.DOM, [attributes].concat(args));
      };

      var bindTag = function bindTag(tagName) {
        return DOMHelpers[tagName] = tag.bind(this, tagName);
      };

      Object.keys(React.DOM).forEach(bindTag);

      DOMHelpers.space = function () {
        return React.DOM.span({
          dangerouslySetInnerHTML: {
            __html: "&nbsp;"
          }
        });
      };
    })();
  }
  return DOMHelpers;
};

var Router = getRouter();
exports.Router = Router;
var DOM = getDOM();

exports.DOM = DOM;
var createView = function createView(id, classArgs) {
  if (typeof id === "string") {
    classArgs._module = id;
    if (!classArgs.displayName) {
      var idComps = id.split("/");
      classArgs.displayName = idComps[idComps.length - 1];
    }
  } else {
    classArgs = id;
    id = null;
  }

  var ReactClass = React.createClass(classArgs);
  var ReactElement = React.createElement.bind(React.createElement, ReactClass);

  return ReactElement;
};
exports.createView = createView;

},{"./helpers":9,"./utils":11}],4:[function(require,module,exports){
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
        var index = this.findListenerIndex(listener);
        var found = index >= 0;
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

},{"./Emitter":4,"./config":8,"./mixins/connect":10}],6:[function(require,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var globalStore = undefined,
    stores = undefined;

var GlobalStore = (function () {
  function GlobalStore() {
    _classCallCheck(this, GlobalStore);
  }

  _createClass(GlobalStore, null, {
    getStore: {
      value: function getStore() {
        if (!globalStore) {
          globalStore = {};
        }
        return globalStore;
      }
    },
    getSubstore: {
      value: function getSubstore(path, init) {
        var store = this.getStore();
        var pathBits = path.split("/");
        var values = store;
        pathBits.forEach(function (bit, i, bits) {
          if (values[bit]) {
            values = values[bit];
          } else {
            values[bit] = typeof init !== undefined && bits.length - 1 === i ? init : {};
            values = values[bit];
          }
        });
        return values;
      }
    },
    init: {
      value: (function (_init) {
        var _initWrapper = function init(_x, _x2, _x3) {
          return _init.apply(this, arguments);
        };

        _initWrapper.toString = function () {
          return _init.toString();
        };

        return _initWrapper;
      })(function (path, init, store) {
        if (stores == null) stores = {};
        stores[path] = store;
        return this.getSubstore(path, init);
      })
    },
    get: {
      value: function get(substore, name) {
        var values = this.getSubstore(substore);
        if (!name) {
          return values;
        }return values ? values[name] : {};
      }
    },
    remove: {
      value: function remove(substore, key) {
        var values = this.getSubstore(substore);

        var success = false;
        if (key) {
          var k = undefined;
          for (k in values) {
            success = values[k] && delete values[k];
          }
        } else {
          success = values[key] && delete values[key];
        }
        return success;
      }
    },
    set: {
      value: function set(substore, name, value) {
        var values = this.getSubstore(substore);
        if (values) values[name] = value;
        return value;
      }
    },
    findStore: {
      value: function findStore(path) {
        return stores[path];
      }
    }
  });

  return GlobalStore;
})();

module.exports = GlobalStore;

},{}],7:[function(require,module,exports){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var Actions = require("./Actions").Actions;

var connect = _interopRequire(require("./mixins/connect"));

var Getter = _interopRequire(require("./Getter"));

var utils = _interopRequire(require("./utils"));

var GlobalStore = _interopRequire(require("./GlobalStore"));

var printTraces = function printTraces(actionName, error) {
  var msg = "Exim: Uncaught error in %s";
  if (error.eximStack) msg += " => " + error.eximStack;
  if (error.message) {
    console.error(msg, actionName, error.message, " ", error.stack);
  } else {
    console.error(msg, actionName, error);
  }
};

var reservedActionNames = {
  path: true, handlers: true, propTypes: true, initial: true,
  connect: true, get: true, set: true, reset: true
};

var Store = (function () {
  function Store() {
    var _this = this;

    var args = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Store);

    var initial = args.initial;
    var path = args.path;
    var actions = args.actions;

    if (path == null) path = "nopath/" + utils.generateId();
    var initValue = (typeof initial === "function" ? initial() : initial) || {};
    this.initial = initValue;
    this.path = path;
    GlobalStore.init(path, initValue, this);

    var stateUpdates = {};

    if (actions == null) {
      actions = Object.keys(args).filter(function (name) {
        return !reservedActionNames[name];
      });
    }

    this.handlers = args.handlers || utils.getWithoutFields(["actions"], args) || {};

    if (Array.isArray(actions)) {
      this.actions = actions = new Actions(actions);
      this.actions.addStore(this);
    }

    var propTypes = args.propTypes;
    var checkPropType = function (propName, value) {
      if (!propTypes || !propTypes[propName]) return;
      var obj = {};
      obj[propName] = value;
      var error = propTypes[propName](obj, propName, path, "prop");
      if (error) throw error;
    };

    var setValue = function (key, value) {
      checkPropType(key, value);
      GlobalStore.set(path, key, value);
    };

    var getValue = function (key, preserved) {
      if (preserved && key in stateUpdates) {
        return stateUpdates[key];
      }
      return GlobalStore.get(path, key);
    };

    var setPreservedValue = function (key, value) {
      checkPropType(key, value);
      stateUpdates[key] = value;
    };

    var getPreservedValue = function (key) {
      return getValue(key, true);
    };

    var removeValue = function (key) {
      return GlobalStore.remove(path, key);
    };

    var set = function (item, value) {
      var options = arguments[2] === undefined ? {} : arguments[2];

      if (utils.isObject(item)) {
        if (utils.isObject(value)) options = value;
        var key = undefined;
        for (key in item) {
          setValue(key, item[key], options);
        }
      } else {
        setValue(item, value, options);
      }
      if (!options.silent) {
        _this._getter.emit();
      }
    };

    var _get = function (item) {
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
        var key = undefined;
        for (key in item) {
          var val = item[key];
          var type = typeof val;
          if (type === "function") {
            result[key] = item[key](getValue(key));
          } else if (type === "string") {
            result[key] = getValue(key)[val];
          }
        }
        return result;
      }
    };

    var get = function () {
      for (var _len = arguments.length, items = Array(_len), _key = 0; _key < _len; _key++) {
        items[_key] = arguments[_key];
      }

      if (items.length === 1) {
        return _get(items[0]);
      } else {
        return items.map(_get);
      }
    };

    var reset = function (item) {
      var options = arguments[1] === undefined ? {} : arguments[1];

      if (item) {
        setValue(item, initValue[item]);
      } else {
        removeValue(item);
      }
      if (!options.silent) {
        _this._getter.emit();
      }
    };

    var preserve = function (arg1, arg2) {
      if (typeof arg2 === "undefined") {
        Object.keys(arg1).forEach(function (key) {
          setPreservedValue(key, arg1[key]);
        });
      } else {
        setPreservedValue(arg1, arg2);
      }
    };

    var getPreserved = function (item) {
      if (typeof item === "string" || typeof item === "number") {
        return getPreservedValue(item);
      } else if (Array.isArray(item)) {
        return item.map(function (key) {
          return getPreservedValue(key);
        });
      } else if (!item) {
        return getPreservedValue();
      } else if (typeof item === "object") {
        var result = {};
        var key = undefined;
        for (key in item) {
          var val = item[key];
          var type = typeof val;
          if (type === "function") {
            result[key] = item[key](getPreservedValue(key));
          } else if (type === "string") {
            result[key] = getPreservedValue(key)[val];
          }
        }
        return result;
      }
    };

    var getPreservedState = function () {
      var newState = stateUpdates;
      stateUpdates = {};
      return newState;
    };

    this.set = set;
    this.get = get;
    this.reset = reset;

    this._stateProto = { set: set, get: get, reset: reset, actions: actions };
    this._preserverProto = { set: preserve, get: getPreserved, reset: reset, actions: actions, getPreservedState: getPreservedState };

    return this._getter = new Getter(this);
  }

  _createClass(Store, {
    addAction: {
      value: function addAction(item) {
        if (Array.isArray(item)) {
          this.actions = this.actions.concat(item);
        } else if (typeof item === "object") {
          this.actions.push(item);
        }
      }
    },
    removeAction: {
      value: function removeAction(item) {
        var action = undefined;
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
        // if (Array.isArray(handler)) {
        //   actions = handlers;
        // } else
        if (typeof handler === "object") {
          // actions = utils.mapActionNames(handler);
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
        var state = Object.create(this._stateProto);
        var preserver = Object.create(this._preserverProto);
        var lastStep = "will";

        var rejectAction = function rejectAction(trace, error) {
          printTraces(trace, error);
          if (!error.eximStack) error.eximStack = trace;
          return Promise.reject(error);
        };

        // Pre-check & preparations.

        var transaction = function transaction(cycleName, body) {
          var result = undefined;

          lastStep = cycleName;
          try {
            result = body();
          } catch (error) {
            return Promise.reject(error);
          }

          if (result && typeof result === "object" && typeof result.then === "function") {
            return result.then(function (res) {
              var preservedState = preserver.getPreservedState();
              var stateChanged = Object.keys(preservedState).length;
              if (stateChanged) {
                state.set(preservedState);
              }
              return Promise.resolve(res);
            });
          } else {
            var preservedState = preserver.getPreservedState();
            var stateChanged = Object.keys(preservedState).length;
            if (stateChanged) {
              state.set(preservedState);
            }
            return Promise.resolve(result);
          }
        };

        if (will) {
          promise = promise.then(function () {
            return transaction("will", function () {
              return will.apply(preserver, args);
            });
          });
        }

        // Actual execution.
        promise = promise.then(function (willResult) {
          return transaction("on", function () {
            if (while_) {
              while_.call(preserver, true);
            }
            if (willResult == null) {
              return on_.apply(preserver, args);
            } else {
              return on_.call(preserver, willResult);
            }
          });
        });

        // For did and didNot state is freezed.
        promise = promise.then(function (onResult) {
          Object.freeze(state);
          return onResult;
        });

        // Handle the result.
        if (did) {
          promise = promise.then(function (onResult) {
            return transaction("did", function () {
              if (while_) while_.call(preserver, false);
              return did.call(preserver, onResult);
            });
          });
        }

        // TODO: check while for duplication.
        if (!did && while_) {
          promise = promise.then(function (onResult) {
            return transaction("while", function () {
              return while_.call(preserver, false);
            });
          });
        }

        promise = promise["catch"](function (error) {
          var start = actionName + "#";
          if (didNot) {
            return transaction("didNot", function () {
              if (while_) while_.call(preserver, false);
              didNot.call(preserver, error)["catch"](function (error) {
                return rejectAction(start + "didNot", error);
              });
            });
          } else {
            return transaction(lastStep, function () {
              if (while_) while_.call(preserver, false);
              return rejectAction(start + lastStep, error);
            });
          }
        });

        return promise;
      }
    }
  });

  return Store;
})();

module.exports = Store;

},{"./Actions":2,"./Getter":5,"./GlobalStore":6,"./mixins/connect":10,"./utils":11}],8:[function(require,module,exports){
"use strict";

module.exports = {
  allowedGetterProps: ["get", "initial", "actions"]
};

},{}],9:[function(require,module,exports){
"use strict";

var hasOwn = ({}).hasOwnProperty;

module.exports = {
  cx: function cx() {
    var classes = "";

    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (!arg) continue;

      var argType = typeof arg;

      if (argType === "string" || argType === "number") {
        classes += " " + arg;
      } else if (Array.isArray(arg)) {
        classes += " " + this.cx.apply(this, arg);
      } else if (argType === "object") {
        var key = undefined;
        for (key in arg) {
          if (hasOwn.call(arg, key) && arg[key]) {
            classes += " " + key;
          }
        }
      }
    }

    return classes.substr(1);
  }
};

},{}],10:[function(require,module,exports){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var utils = _interopRequire(require("../utils"));

var getConnectMixin = function getConnectMixin(store) {
  for (var _len = arguments.length, key = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    key[_key - 1] = arguments[_key];
  }

  var getStateFromArray = function getStateFromArray(source, array) {
    var state = {};
    array.forEach(function (k) {
      if (typeof k === "string") {
        state[k] = source.get(k);
      } else if (utils.isObject(k)) {
        Object.keys(k).forEach(function (name) {
          if (typeof k[name] === "function") {
            state[k] = k[name](source.get(k));
          } else if (typeof k[name] === "string") {
            state[k[name]] = source.get(name);
          }
        });
      }
    });
    return state;
  };

  var getState = function getState() {
    return key.length ? getStateFromArray(store, key) : store.get();
  };

  var changeCallback = function changeCallback() {
    var prev = this.state;
    var curr = getState();
    var diff = Object.keys(curr).some(function (key) {
      return prev[key] !== curr[key];
    });
    if (diff) this.setState(curr);
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
};

module.exports = getConnectMixin;

},{"../utils":11}],11:[function(require,module,exports){
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

var _objectClass = "[object Object]";
utils.isObject = function (targ) {
  return targ ? targ.toString() === _objectClass : false;
};

utils.capitalize = function (str) {
  var first = str.charAt(0).toUpperCase();
  var rest = str.slice(1);
  return "" + first + "" + rest;
};

var idFormat = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
var pad = 16;
utils.generateId = function () {
  return idFormat.replace(/[xy]/g, function (c) {
    var r = Math.random() * pad | 0;
    var v = c === "x" ? r : r & 3 | pad / 2;
    return v.toString(pad);
  });
};

module.exports = utils;

},{}]},{},[1]);
