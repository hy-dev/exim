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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2NocmlzL2NvZGUvZXhpbS9zcmMvRE9NSGVscGVycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztRQXdEZ0IsVUFBVSxHQUFWLFVBQVU7Ozs7O0lBeERuQixLQUFLLDJCQUFNLE9BQU87O0lBQ2xCLFdBQVcsMkJBQU0sY0FBYzs7QUFFdEMsU0FBUyxTQUFTLEdBQUk7QUFDcEIsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO0FBQ2xCLE1BQUksT0FBTyxXQUFXLEtBQUssV0FBVyxFQUFFO0FBQ3RDLFFBQUksY0FBYyxHQUFHLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDO1FBQ3BILFlBQVksR0FBRyxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUM7UUFDdEMsZUFBZSxHQUFHLENBQUMsUUFBUSxFQUFFLG9CQUFvQixFQUFFLHFCQUFxQixFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSwrQkFBK0IsRUFBRSxLQUFLLENBQUM7UUFDbEosYUFBYSxHQUFHLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsd0JBQXdCLEVBQUUscUJBQXFCLENBQUM7UUFDcEssV0FBVyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDOztBQUV6RSxrQkFBYyxDQUFDLE9BQU8sQ0FBQyxVQUFTLElBQUksRUFBRTtBQUNwQyxZQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ25FLENBQUMsQ0FBQzs7QUFFSCxlQUFXLENBQUMsT0FBTyxDQUFDLFVBQVMsSUFBSSxFQUFFO0FBQ2pDLFlBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDbEMsQ0FBQyxDQUFDO0dBQ0o7QUFDRCxTQUFPLE1BQU0sQ0FBQztDQUNmOztBQUVELFNBQVMsTUFBTSxHQUFJO0FBQ2pCLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQzs7QUFFdEIsTUFBSSxPQUFPLEtBQUssS0FBSyxXQUFXLEVBQUU7QUFDaEMsUUFBSSxHQUFHLEdBQUcsYUFBVSxJQUFJLEVBQVc7d0NBQU4sSUFBSTtBQUFKLFlBQUk7OztBQUMvQixVQUFJLFVBQVUsWUFBQSxDQUFDO0FBQ2YsVUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7QUFDM0MsVUFBSSxLQUFLLEtBQUssTUFBTSxFQUFFO0FBQ3BCLGtCQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO09BQzNCLE1BQU07QUFDTCxrQkFBVSxHQUFHLEVBQUUsQ0FBQztPQUNqQjtBQUNELGFBQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ3BFLENBQUM7O0FBRUYsU0FBSyxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsR0FBRyxFQUFFO0FBQzdCLGdCQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDL0M7O0FBRUQsY0FBVSxDQUFDLEtBQUssR0FBRyxZQUFXO0FBQzVCLGFBQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7QUFDcEIsK0JBQXVCLEVBQUU7QUFDdkIsZ0JBQU0sRUFBRSxRQUFRO1NBQ2pCO09BQ0YsQ0FBQyxDQUFDO0tBQ0osQ0FBQztHQUNIO0FBQ0QsU0FBTyxVQUFVLENBQUM7Q0FDbkI7O0FBRU0sSUFBTSxNQUFNLEdBQUcsU0FBUyxFQUFFLENBQUM7UUFBckIsTUFBTSxHQUFOLE1BQU07QUFDWixJQUFNLEdBQUcsR0FBRyxNQUFNLEVBQUUsQ0FBQzs7UUFBZixHQUFHLEdBQUgsR0FBRzs7QUFFVCxTQUFTLFVBQVUsQ0FBRSxTQUFTLEVBQUU7QUFDckMsTUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM5QyxNQUFJLFlBQVksR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQzdFLFNBQU8sWUFBWSxDQUFDO0NBQ3JCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IFJlYWN0Um91dGVyIGZyb20gJ3JlYWN0LXJvdXRlcic7XG5cbmZ1bmN0aW9uIGdldFJvdXRlciAoKSB7XG4gIGNvbnN0IFJvdXRlciA9IHt9O1xuICBpZiAodHlwZW9mIFJlYWN0Um91dGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgIGxldCByb3V0ZXJFbGVtZW50cyA9IFsnUm91dGUnLCAnRGVmYXVsdFJvdXRlJywgJ1JvdXRlSGFuZGxlcicsICdBY3RpdmVIYW5kbGVyJywgJ05vdEZvdW5kUm91dGUnLCAnTGluaycsICdSZWRpcmVjdCddLFxuICAgIHJvdXRlck1peGlucyA9IFsnTmF2aWdhdGlvbicsICdTdGF0ZSddLFxuICAgIHJvdXRlckZ1bmN0aW9ucyA9IFsnY3JlYXRlJywgJ2NyZWF0ZURlZmF1bHRSb3V0ZScsICdjcmVhdGVOb3RGb3VuZFJvdXRlJywgJ2NyZWF0ZVJlZGlyZWN0JywgJ2NyZWF0ZVJvdXRlJywgJ2NyZWF0ZVJvdXRlc0Zyb21SZWFjdENoaWxkcmVuJywgJ3J1biddLFxuICAgIHJvdXRlck9iamVjdHMgPSBbJ0hhc2hMb2NhdGlvbicsICdIaXN0b3J5JywgJ0hpc3RvcnlMb2NhdGlvbicsICdSZWZyZXNoTG9jYXRpb24nLCAnU3RhdGljTG9jYXRpb24nLCAnVGVzdExvY2F0aW9uJywgJ0ltaXRhdGVCcm93c2VyQmVoYXZpb3InLCAnU2Nyb2xsVG9Ub3BCZWhhdmlvciddLFxuICAgIGNvcGllZEl0ZW1zID0gcm91dGVyTWl4aW5zLmNvbmNhdChyb3V0ZXJGdW5jdGlvbnMpLmNvbmNhdChyb3V0ZXJPYmplY3RzKTtcblxuICAgIHJvdXRlckVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgUm91dGVyW25hbWVdID0gUmVhY3QuY3JlYXRlRWxlbWVudC5iaW5kKFJlYWN0LCBSZWFjdFJvdXRlcltuYW1lXSk7XG4gICAgfSk7XG5cbiAgICBjb3BpZWRJdGVtcy5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIFJvdXRlcltuYW1lXSA9IFJlYWN0Um91dGVyW25hbWVdO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBSb3V0ZXI7XG59XG5cbmZ1bmN0aW9uIGdldERPTSAoKSB7XG4gIGNvbnN0IERPTUhlbHBlcnMgPSB7fTtcblxuICBpZiAodHlwZW9mIFJlYWN0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGxldCB0YWcgPSBmdW5jdGlvbiAobmFtZSwgLi4uYXJncykge1xuICAgICAgbGV0IGF0dHJpYnV0ZXM7XG4gICAgICBsZXQgZmlyc3QgPSBhcmdzWzBdICYmIGFyZ3NbMF0uY29uc3RydWN0b3I7XG4gICAgICBpZiAoZmlyc3QgPT09IE9iamVjdCkge1xuICAgICAgICBhdHRyaWJ1dGVzID0gYXJncy5zaGlmdCgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXR0cmlidXRlcyA9IHt9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIFJlYWN0LkRPTVtuYW1lXS5hcHBseShSZWFjdC5ET00sIFthdHRyaWJ1dGVzXS5jb25jYXQoYXJncykpO1xuICAgIH07XG5cbiAgICBmb3IgKGxldCB0YWdOYW1lIGluIFJlYWN0LkRPTSkge1xuICAgICAgRE9NSGVscGVyc1t0YWdOYW1lXSA9IHRhZy5iaW5kKHRoaXMsIHRhZ05hbWUpO1xuICAgIH1cblxuICAgIERPTUhlbHBlcnMuc3BhY2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBSZWFjdC5ET00uc3Bhbih7XG4gICAgICAgIGRhbmdlcm91c2x5U2V0SW5uZXJIVE1MOiB7XG4gICAgICAgICAgX19odG1sOiAnJm5ic3A7J1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuICB9XG4gIHJldHVybiBET01IZWxwZXJzO1xufVxuXG5leHBvcnQgY29uc3QgUm91dGVyID0gZ2V0Um91dGVyKCk7XG5leHBvcnQgY29uc3QgRE9NID0gZ2V0RE9NKCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVWaWV3IChjbGFzc0FyZ3MpIHtcbiAgbGV0IFJlYWN0Q2xhc3MgPSBSZWFjdC5jcmVhdGVDbGFzcyhjbGFzc0FyZ3MpO1xuICBsZXQgUmVhY3RFbGVtZW50ID0gUmVhY3QuY3JlYXRlRWxlbWVudC5iaW5kKFJlYWN0LmNyZWF0ZUVsZW1lbnQsIFJlYWN0Q2xhc3MpO1xuICByZXR1cm4gUmVhY3RFbGVtZW50O1xufVxuIl19
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
    var store = initial ? Object.create(initial) : {};

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
      var correctArgs = ["key", "value"].every(function (item) {
        return typeof item === "string";
      });
      return correctArgs ? store[key] = value : false;
    };

    var getValue = function getValue(key) {
      return key ? store[key] : Object.create(store);
    };

    var removeValue = function removeValue(key) {
      var success = false;
      if (!key) {
        for (var _key in store) {
          success = store[_key] && delete store[_key];
        }
      } else {
        success = store[key] && delete store[key];
      }
      return success;
    };

    var set = function set(item, value) {
      var options = arguments[2] === undefined ? {} : arguments[2];

      if (utils.isObject(item)) {
        if (utils.isObject(value)) options = value;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9jaHJpcy9jb2RlL2V4aW0vc3JjL2luZGV4LmpzIiwiL2hvbWUvY2hyaXMvY29kZS9leGltL3NyYy9BY3Rpb25zLmpzIiwic3JjL0RPTUhlbHBlcnMuanMiLCIvaG9tZS9jaHJpcy9jb2RlL2V4aW0vc3JjL0VtaXR0ZXIuanMiLCIvaG9tZS9jaHJpcy9jb2RlL2V4aW0vc3JjL0dldHRlci5qcyIsIi9ob21lL2NocmlzL2NvZGUvZXhpbS9zcmMvU3RvcmUuanMiLCIvaG9tZS9jaHJpcy9jb2RlL2V4aW0vc3JjL2NvbmZpZy5qcyIsIi9ob21lL2NocmlzL2NvZGUvZXhpbS9zcmMvaGVscGVycy5qcyIsIi9ob21lL2NocmlzL2NvZGUvZXhpbS9zcmMvbWl4aW5zL2Nvbm5lY3QuanMiLCIvaG9tZS9jaHJpcy9jb2RlL2V4aW0vc3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozt1QkNBOEIsV0FBVzs7SUFBakMsTUFBTSxZQUFOLE1BQU07SUFBRSxPQUFPLFlBQVAsT0FBTzs7SUFDaEIsS0FBSywyQkFBTSxTQUFTOztJQUNwQixPQUFPLDJCQUFNLFdBQVc7OzBCQUNPLGNBQWM7O0lBQTVDLFVBQVUsZUFBVixVQUFVO0lBQUUsTUFBTSxlQUFOLE1BQU07SUFBRSxHQUFHLGVBQUgsR0FBRzs7QUFFL0IsSUFBTSxJQUFJLEdBQUcsRUFBQyxNQUFNLEVBQU4sTUFBTSxFQUFFLE9BQU8sRUFBUCxPQUFPLEVBQUUsS0FBSyxFQUFMLEtBQUssRUFBRSxNQUFNLEVBQU4sTUFBTSxFQUFFLEdBQUcsRUFBSCxHQUFHLEVBQUUsT0FBTyxFQUFQLE9BQU8sRUFBRSxVQUFVLEVBQVYsVUFBVSxFQUFDLENBQUM7O0FBRXhFLElBQUksQ0FBQyxZQUFZLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDbEMsU0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUN6QixDQUFDOztBQUVGLElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDbkMsU0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUMxQixDQUFDOztBQUVGLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDakMsU0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUN4QixDQUFDOztpQkFFYSxJQUFJOzs7Ozs7Ozs7Ozs7O0lDbkJOLE1BQU0sV0FBTixNQUFNO0FBQ04sV0FEQSxNQUFNLENBQ0wsSUFBSSxFQUFFOzBCQURQLE1BQU07O1FBRVIsS0FBSyxHQUF3QixJQUFJLENBQUMsS0FBSztRQUFoQyxNQUFNLEdBQTRCLElBQUksQ0FBQyxNQUFNO1FBQXJDLFNBQVMsR0FBOEIsRUFBRTs7QUFDL0QsUUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDOztBQUV0QixRQUFJLEtBQUssRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ2pDLFFBQUksTUFBTSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQzs7QUFFcEQsUUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7R0FDekI7O2VBVFUsTUFBTTtBQVdqQixPQUFHO2FBQUEsZUFBVTs7OzBDQUFOLElBQUk7QUFBSixjQUFJOzs7QUFDVCxZQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEtBQUs7aUJBQ3hDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLE1BQUssSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQUEsQ0FDdEQsQ0FBQztBQUNGLGVBQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztPQUNsQzs7QUFFRCxZQUFRO2FBQUEsa0JBQUMsS0FBSyxFQUFFO0FBQ2QsWUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7T0FDekI7Ozs7U0FwQlUsTUFBTTs7O0lBdUJOLE9BQU8sV0FBUCxPQUFPO0FBQ1AsV0FEQSxPQUFPLENBQ04sT0FBTyxFQUFFOzs7MEJBRFYsT0FBTzs7QUFFaEIsUUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDZCxRQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDMUIsYUFBTyxDQUFDLE9BQU8sQ0FBRSxVQUFBLE1BQU07ZUFBSSxNQUFLLFNBQVMsQ0FBQyxNQUFNLENBQUM7T0FBQSxFQUFHLElBQUksQ0FBQyxDQUFDO0tBQzNEO0dBQ0Y7O2VBTlUsT0FBTztBQVFsQixhQUFTO2FBQUEsbUJBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtBQUMxQixZQUFNLE1BQU0sR0FBRyxVQUFVLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDNUQsWUFBSSxDQUFDLFVBQVUsRUFBRTtBQUNmLGNBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDNUIsY0FBSSxHQUFHLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNoQyxjQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN0QixjQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQzdDOztBQUVELGVBQU8sTUFBTSxDQUFDO09BQ2Y7O0FBRUQsZ0JBQVk7YUFBQSxzQkFBQyxJQUFJLEVBQUU7QUFDakIsWUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDN0MsWUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdkMsWUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzVDLGVBQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUMxQjs7QUFFRCxZQUFRO2FBQUEsa0JBQUMsS0FBSyxFQUFFO0FBQ2QsWUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBQSxNQUFNO2lCQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1NBQUEsQ0FBQyxDQUFDO09BQ3BEOztBQUVELGdCQUFZO2FBQUEsc0JBQUMsTUFBTSxFQUFFLEtBQUssRUFBRTtBQUMxQixZQUFJLE1BQU0sQ0FBQyxXQUFXLEtBQUssTUFBTSxFQUFFO0FBQ2pDLGlCQUFPLE1BQU0sQ0FBQztTQUNmLE1BQU0sSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUU7QUFDckMsaUJBQU8sS0FBTSxHQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUMsQ0FBQyxDQUFDO1NBQzVEO09BQ0Y7Ozs7U0FyQ1UsT0FBTzs7OztBQ3ZCcEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7OztlQ2hGYSxvQkFBRzs7O0FBQ1osUUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7R0FDdEI7OztBQUVELHFCQUFpQjthQUFBLDJCQUFDLFFBQVEsRUFBRTtBQUMxQixlQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO09BQzFDOztBQUVELGdCQUFZO2FBQUEsc0JBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRTtBQUM5QixZQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2xELFlBQUksQ0FBQyxLQUFLLEVBQUU7QUFDVixjQUFJLE9BQU8sRUFBRSxRQUFRLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQztBQUNyQyxjQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNoQztBQUNELGVBQU8sSUFBSSxDQUFDO09BQ2I7O0FBRUQsbUJBQWU7YUFBQSx5QkFBQyxRQUFRLEVBQUU7QUFDeEIsWUFBSSxLQUFLLFlBQUE7WUFBRSxLQUFLLEdBQUcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBLElBQUssQ0FBQyxDQUFDO0FBQ25FLFlBQUksS0FBSyxFQUFFO0FBQ1QsY0FBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ2xDO0FBQ0QsZUFBTyxJQUFJLENBQUM7T0FDYjs7QUFFRCxRQUFJO2FBQUEsZ0JBQUc7QUFDTCxZQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFBLFFBQVE7aUJBQUksUUFBUSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLEVBQUU7U0FBQSxDQUFDLENBQUM7T0FDaEc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUM1QkksT0FBTywyQkFBTSxXQUFXOztJQUN4QixNQUFNLDJCQUFNLFVBQVU7O0lBQ3RCLGVBQWUsMkJBQU0sa0JBQWtCOztJQUV6QixNQUFNO0FBQ2QsV0FEUSxNQUFNLENBQ2IsS0FBSyxFQUFFOzs7MEJBREEsTUFBTTs7QUFFdkIsK0JBRmlCLE1BQU0sNkNBRWY7OztBQUdSLFVBQU0sQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJO2FBQUksTUFBSyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO0tBQUEsQ0FBQyxDQUFDOzs7ZUFHbEMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUM7Ozs7QUFBMUUsUUFBSSxDQUFDLFFBQVE7QUFBRSxRQUFJLENBQUMsU0FBUzs7O0FBRzlCLFFBQUksQ0FBQyxPQUFPLEdBQUcsWUFBbUI7d0NBQU4sSUFBSTtBQUFKLFlBQUk7OztBQUM5QixhQUFPLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDekQsQ0FBQztHQUNIOztZQWRrQixNQUFNOztTQUFOLE1BQU07R0FBUyxPQUFPOztpQkFBdEIsTUFBTTs7Ozs7Ozs7Ozs7SUNKbkIsT0FBTyxXQUFPLFdBQVcsRUFBekIsT0FBTzs7SUFDUixNQUFNLDJCQUFNLFVBQVU7O0lBQ3RCLEtBQUssMkJBQU0sU0FBUzs7SUFFTixLQUFLO0FBQ2IsV0FEUSxLQUFLLEdBQ0g7UUFBVCxJQUFJLGdDQUFDLEVBQUU7OzBCQURBLEtBQUs7O1FBRWpCLE9BQU8sR0FBYSxJQUFJLENBQXhCLE9BQU87UUFBRSxPQUFPLEdBQUksSUFBSSxDQUFmLE9BQU87O0FBQ3JCLFFBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxHQUFHLE9BQU8sT0FBTyxLQUFLLFVBQVUsR0FBRyxPQUFPLEVBQUUsR0FBRyxPQUFPLENBQUM7QUFDN0UsUUFBTSxLQUFLLEdBQUcsT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDOztBQUVwRCxRQUFJLGNBQWMsWUFBQSxDQUFDO0FBQ25CLFFBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFO0FBQ3hCLG9CQUFjLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztLQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUU7QUFDN0Msb0JBQWMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDOzs7O0tBSTVCLE1BQU0sSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsS0FBSyxHQUFHLEVBQUU7QUFDbEQsb0JBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDO0tBQ3RDO0FBQ0QsUUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7O0FBRXJDLFFBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7O0FBRWpGLFFBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtBQUMxQixVQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM5QyxVQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUM3Qjs7QUFFRCxRQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7O0FBRWpCLFFBQU0sUUFBUSxHQUFHLGtCQUFVLEdBQUcsRUFBRSxLQUFLLEVBQUU7QUFDckMsVUFBTSxXQUFXLEdBQUcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQUEsSUFBSTtlQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVE7T0FBQSxDQUFDLENBQUM7QUFDN0UsYUFBTyxXQUFZLEdBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUM7S0FDbkQsQ0FBQzs7QUFFRixRQUFNLFFBQVEsR0FBRyxrQkFBVSxHQUFHLEVBQUU7QUFDOUIsYUFBTyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDaEQsQ0FBQzs7QUFFRixRQUFNLFdBQVcsR0FBRyxxQkFBVSxHQUFHLEVBQUU7QUFDakMsVUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO0FBQ3BCLFVBQUksQ0FBQyxHQUFHLEVBQUU7QUFDUixhQUFLLElBQUksSUFBRyxJQUFJLEtBQUssRUFBRTtBQUNyQixpQkFBTyxHQUFHLEtBQUssQ0FBQyxJQUFHLENBQUMsSUFBSSxPQUFPLEtBQUssQ0FBQyxJQUFHLENBQUMsQ0FBQztTQUMzQztPQUNGLE1BQU07QUFDTixlQUFPLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO09BQzFDO0FBQ0QsYUFBTyxPQUFPLENBQUM7S0FDaEIsQ0FBQzs7QUFFRixRQUFNLEdBQUcsR0FBRyxhQUFVLElBQUksRUFBRSxLQUFLLEVBQWM7VUFBWixPQUFPLGdDQUFDLEVBQUU7O0FBQzNDLFVBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUN4QixZQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxHQUFHLEtBQUssQ0FBQztBQUMzQyxhQUFLLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtBQUNwQixrQkFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDbkM7T0FDRixNQUFNO0FBQ0wsZ0JBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO09BQ2hDO0FBQ0QsVUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7QUFDbkIsYUFBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztPQUNyQjtLQUNGLENBQUM7O0FBRUYsUUFBTSxHQUFHLEdBQUcsYUFBVSxJQUFJLEVBQUU7QUFDMUIsVUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO0FBQ3hELGVBQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQzlCLGVBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEdBQUc7aUJBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQztTQUFBLENBQUMsQ0FBQztPQUN2QyxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDaEIsZUFBTyxRQUFRLEVBQUUsQ0FBQztPQUNuQixNQUFNLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO0FBQ25DLFlBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztBQUNoQixhQUFLLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtBQUNwQixjQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDcEIsY0FBSSxJQUFJLEdBQUcsT0FBTyxHQUFHLENBQUM7QUFDdEIsY0FBSSxJQUFJLEtBQUssVUFBVSxFQUFFO0FBQ3ZCLGtCQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1dBQ3ZDLE1BQU0sSUFBSSxJQUFJLEtBQUssT0FBTyxFQUFFO0FBQzVCLGtCQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1dBQ2xDO1NBQ0Y7QUFDRCxlQUFPLE1BQU0sQ0FBQztPQUNmO0tBQ0YsQ0FBQzs7QUFFRixRQUFNLEtBQUssR0FBRyxlQUFVLElBQUksRUFBYztVQUFaLE9BQU8sZ0NBQUMsRUFBRTs7QUFDdEMsVUFBSSxJQUFJLEVBQUU7QUFDUixnQkFBUSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztPQUMvQixNQUFNO0FBQ0wsbUJBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUNuQjtBQUNELFVBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFO0FBQ25CLGFBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7T0FDckI7S0FDRixDQUFDOztBQUVGLFFBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0FBQ2YsUUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7QUFDZixRQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQzs7QUFFbkIsUUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFDLEdBQUcsRUFBSCxHQUFHLEVBQUUsR0FBRyxFQUFILEdBQUcsRUFBRSxLQUFLLEVBQUwsS0FBSyxFQUFFLE9BQU8sRUFBUCxPQUFPLEVBQUMsQ0FBQztBQUM3QyxRQUFJLENBQUMsTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQy9CLFdBQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztHQUNwQjs7ZUF2R2tCLEtBQUs7QUF5R3hCLGFBQVM7YUFBQSxtQkFBQyxJQUFJLEVBQUU7QUFDZCxZQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDdkIsY0FBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDbEQsTUFBTSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRTtBQUNuQyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN6QjtPQUNGOztBQUVELGdCQUFZO2FBQUEsc0JBQUMsSUFBSSxFQUFFO0FBQ2pCLFlBQUksTUFBTSxDQUFDO0FBQ1gsWUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7QUFDNUIsZ0JBQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDbEQsY0FBSSxNQUFNLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN0QyxNQUFNLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO0FBQ25DLGdCQUFNLEdBQUcsSUFBSSxDQUFDO0FBQ2QsY0FBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDekMsY0FBSSxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUU7QUFDaEIsa0JBQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDekIsZ0JBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1dBQzlDO1NBQ0Y7T0FDRjs7QUFFRCxrQkFBYzthQUFBLHdCQUFDLFVBQVUsRUFBZTtZQUFiLE1BQU0sZ0NBQUMsSUFBSTs7QUFDcEMsWUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqRCxZQUFNLGNBQWMsUUFBTSxNQUFNLFFBQUcsV0FBVyxDQUFHO0FBQ2pELFlBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMzRSxZQUFJLENBQUMsT0FBTyxFQUFFO0FBQ1osZ0JBQU0sSUFBSSxLQUFLLHNCQUFvQixVQUFVLHNDQUFtQyxDQUFDO1NBQ2xGOztBQUVELFlBQUksT0FBTyxZQUFBLENBQUM7QUFDWixZQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRTtBQUMvQixpQkFBTyxHQUFHLE9BQU8sQ0FBQztTQUNuQixNQUFNLElBQUksT0FBTyxPQUFPLEtBQUssVUFBVSxFQUFFO0FBQ3hDLGlCQUFPLEdBQUcsRUFBQyxFQUFFLEVBQUUsT0FBTyxFQUFDLENBQUM7U0FDekIsTUFBTTtBQUNMLGdCQUFNLElBQUksS0FBSyxNQUFJLE9BQU8sb0NBQWlDLENBQUM7U0FDN0Q7QUFDRCxlQUFPLE9BQU8sQ0FBQztPQUNoQjs7QUFPRCxZQUFROzs7Ozs7OzthQUFBLGtCQUFDLFVBQVUsRUFBVzswQ0FBTixJQUFJO0FBQUosY0FBSTs7OztBQUUxQixZQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzlDLFlBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNoQyxZQUFJLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSTtZQUFFLE1BQU0sR0FBRyxLQUFLLFNBQU07WUFBRSxHQUFHLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQztBQUM1RCxZQUFJLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRztZQUFFLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDOzs7QUFHM0MsWUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7OztBQUczQyxZQUFJLElBQUksRUFBRSxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFNO0FBQ3JDLGlCQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ2hDLENBQUMsQ0FBQzs7O0FBR0gsWUFBSSxNQUFNLEVBQUUsT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBQyxVQUFVLEVBQUs7QUFDakQsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3pCLGlCQUFPLFVBQVUsQ0FBQztTQUNuQixDQUFDLENBQUM7OztBQUdILGVBQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQUMsVUFBVSxFQUFLO0FBQ3JDLGNBQUksVUFBVSxJQUFJLElBQUksRUFBRTtBQUN0QixtQkFBTyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztXQUMvQixNQUFNO0FBQ0wsbUJBQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7V0FDcEM7U0FDRixDQUFDLENBQUM7OztBQUdILFlBQUksTUFBTSxFQUFFLE9BQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQUMsUUFBUSxFQUFLO0FBQy9DLGdCQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztBQUMxQixpQkFBTyxRQUFRLENBQUM7U0FDakIsQ0FBQyxDQUFDOzs7QUFHSCxlQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFDLFFBQVEsRUFBSztBQUNuQyxnQkFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNyQixpQkFBTyxRQUFRLENBQUM7U0FDakIsQ0FBQyxDQUFDOzs7QUFHSCxZQUFJLEdBQUcsRUFBRSxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFBLFFBQVEsRUFBSTtBQUMxQyxpQkFBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztTQUNsQyxDQUFDLENBQUM7O0FBRUgsZUFBTyxTQUFNLENBQUMsVUFBQSxLQUFLLEVBQUk7QUFDckIsY0FBSSxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDdEMsY0FBSSxNQUFNLEVBQUU7QUFDVixrQkFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7V0FDM0IsTUFBTTtBQUNMLGtCQUFNLEtBQUssQ0FBQztXQUNiO1NBQ0YsQ0FBQyxDQUFDOztBQUVILGVBQU8sT0FBTyxDQUFDO09BQ2hCOzs7O1NBak5rQixLQUFLOzs7aUJBQUwsS0FBSzs7Ozs7aUJDSlg7QUFDYixvQkFBa0IsRUFBRSxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDO0NBQ2xEOzs7OztpQkNGYztBQUNiLElBQUUsRUFBRSxZQUFVLFVBQVUsRUFBRTtBQUN4QixRQUFJLE9BQU8sVUFBVSxJQUFJLFFBQVEsRUFBRTtBQUNqQyxhQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsU0FBUyxFQUFFO0FBQ3hELGVBQU8sVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO09BQzlCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDZCxNQUFNO0FBQ0wsYUFBTyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ2xEO0dBQ0Y7Q0FDRjs7Ozs7OztpQkNSdUIsZUFBZTs7SUFGaEMsS0FBSywyQkFBTSxVQUFVOztBQUViLFNBQVMsZUFBZSxDQUFFLEtBQUssRUFBVTtvQ0FBTCxHQUFHO0FBQUgsT0FBRzs7O0FBQ3BELE1BQUksaUJBQWlCLEdBQUcsMkJBQVUsTUFBTSxFQUFFLEtBQUssRUFBRTtBQUMvQyxRQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDZixTQUFLLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQyxFQUFJO0FBQ2pCLFVBQUksT0FBTyxDQUFDLEtBQUssUUFBUSxFQUFFOztBQUV6QixhQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUM1QixjQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUksRUFBSTtBQUM3QixjQUFJLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLFVBQVUsRUFBRTs7QUFFakMsaUJBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1dBQ25DLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxRQUFRLEVBQUU7O0FBRXRDLGlCQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztXQUNuQztTQUNGLENBQUMsQ0FBQztPQUNKO0tBQ0YsQ0FBQyxDQUFDO0FBQ0gsV0FBTyxLQUFLLENBQUM7R0FDZCxDQUFDOztBQUVGLE1BQUksUUFBUSxHQUFHLG9CQUFZO0FBQ3pCLFFBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTs7QUFFZCxhQUFPLGlCQUFpQixDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztLQUN0QyxNQUFNOztBQUVMLGFBQU8sS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO0tBQ3BCO0dBQ0YsQ0FBQzs7QUFFRixNQUFJLGNBQWMsR0FBRywwQkFBWTtBQUMvQixRQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7R0FDM0IsQ0FBQzs7QUFFRixTQUFPO0FBQ0wsbUJBQWUsRUFBRSwyQkFBWTtBQUMzQixhQUFPLFFBQVEsRUFBRSxDQUFDO0tBQ25COztBQUVELHFCQUFpQixFQUFFLDZCQUFZO0FBQzdCLFdBQUssQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3RDOztBQUVELHdCQUFvQixFQUFFLGdDQUFZO0FBQ2hDLFdBQUssQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7S0FDakM7R0FDRixDQUFDO0NBQ0g7Ozs7O0FDbkRELElBQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQzs7QUFFakIsS0FBSyxDQUFDLGdCQUFnQixHQUFHLFVBQVUsT0FBTyxFQUFFLE1BQU0sRUFBRTtBQUNsRCxNQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQztBQUNwRSxNQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDaEIsTUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUUsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDckQsTUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNoQyxTQUFPLENBQUMsT0FBTyxDQUFDLFVBQVMsU0FBUyxFQUFFO0FBQ2xDLFNBQUssQ0FDRixNQUFNLENBQUMsVUFBUyxHQUFHLEVBQUU7QUFDcEIsYUFBTyxHQUFHLEtBQUssU0FBUyxDQUFDO0tBQzFCLENBQUMsQ0FDRCxPQUFPLENBQUMsVUFBUyxHQUFHLEVBQUU7QUFDckIsWUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUMzQixDQUFDLENBQUM7R0FDTixDQUFDLENBQUM7QUFDSCxTQUFPLE1BQU0sQ0FBQztDQUNmLENBQUM7O0FBRUYsS0FBSyxDQUFDLGFBQWEsR0FBRyxVQUFVLE1BQU0sRUFBRTtBQUN0QyxTQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsR0FBRztXQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUM7R0FBQSxDQUFDLENBQUM7Q0FDcEQsQ0FBQzs7QUFFRixLQUFLLENBQUMsYUFBYSxHQUFHLFVBQVUsSUFBSSxFQUFFLElBQUksRUFBRTtBQUMxQyxTQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQ2xELENBQUM7Ozs7Ozs7QUFPRixLQUFLLENBQUMsY0FBYyxHQUFHLFVBQVMsTUFBTSxFQUFFO0FBQ3RDLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUNoQixNQUFNLFFBQVEsR0FBRyxDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDM0UsVUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUksRUFBSTtBQUN2QixRQUFJLElBQUksR0FBRyxJQUFJLENBQUM7QUFDaEIsUUFBSSxJQUFJLEtBQUssWUFBWSxJQUFJLElBQUksS0FBSyxVQUFVLEVBQUU7QUFDaEQsVUFBSSxHQUFHLE9BQU8sQ0FBQztLQUNoQjtBQUNELFFBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ2hCLFVBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNqQztHQUNGLENBQUMsQ0FBQztBQUNILFNBQU8sSUFBSSxDQUFDO0NBQ2IsQ0FBQzs7QUFFRixLQUFLLENBQUMsUUFBUSxHQUFHLFVBQVUsSUFBSSxFQUFFO0FBQy9CLFNBQU8sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxLQUFLLFFBQVEsR0FBRyxLQUFLLENBQUM7Q0FDaEUsQ0FBQztBQUNGLEtBQUssQ0FBQyxVQUFVLEdBQUcsVUFBVSxHQUFHLEVBQUU7QUFDaEMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUMxQyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFCLGNBQVUsS0FBSyxRQUFHLElBQUksQ0FBRztDQUMxQixDQUFDOztpQkFFYSxLQUFLIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCB7QWN0aW9uLCBBY3Rpb25zfSBmcm9tICcuL0FjdGlvbnMnO1xuaW1wb3J0IFN0b3JlIGZyb20gJy4vU3RvcmUnO1xuaW1wb3J0IGhlbHBlcnMgZnJvbSAnLi9oZWxwZXJzJztcbmltcG9ydCB7Y3JlYXRlVmlldywgUm91dGVyLCBET019IGZyb20gJy4vRE9NSGVscGVycyc7XG5cbmNvbnN0IEV4aW0gPSB7QWN0aW9uLCBBY3Rpb25zLCBTdG9yZSwgUm91dGVyLCBET00sIGhlbHBlcnMsIGNyZWF0ZVZpZXd9O1xuXG5FeGltLmNyZWF0ZUFjdGlvbiA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gIHJldHVybiBuZXcgQWN0aW9uKGFyZ3MpO1xufTtcblxuRXhpbS5jcmVhdGVBY3Rpb25zID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgcmV0dXJuIG5ldyBBY3Rpb25zKGFyZ3MpO1xufTtcblxuRXhpbS5jcmVhdGVTdG9yZSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gIHJldHVybiBuZXcgU3RvcmUoYXJncyk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBFeGltO1xuIiwiZXhwb3J0IGNsYXNzIEFjdGlvbiB7XG4gIGNvbnN0cnVjdG9yKGFyZ3MpIHtcbiAgICBjb25zdCBbc3RvcmUsIHN0b3JlcywgYWxsU3RvcmVzXSA9IFthcmdzLnN0b3JlLCBhcmdzLnN0b3JlcywgW11dO1xuICAgIHRoaXMubmFtZSA9IGFyZ3MubmFtZTtcblxuICAgIGlmIChzdG9yZSkgYWxsU3RvcmVzLnB1c2goc3RvcmUpO1xuICAgIGlmIChzdG9yZXMpIGFsbFN0b3Jlcy5wdXNoLmFwcGx5KGFsbFN0b3Jlcywgc3RvcmVzKTtcblxuICAgIHRoaXMuc3RvcmVzID0gYWxsU3RvcmVzO1xuICB9XG5cbiAgcnVuKC4uLmFyZ3MpIHtcbiAgICBjb25zdCBzdG9yZXNDeWNsZXMgPSB0aGlzLnN0b3Jlcy5tYXAoc3RvcmUgPT5cbiAgICAgIHN0b3JlLnJ1bkN5Y2xlLmFwcGx5KHN0b3JlLCBbdGhpcy5uYW1lXS5jb25jYXQoYXJncykpXG4gICAgKTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoc3RvcmVzQ3ljbGVzKTtcbiAgfVxuXG4gIGFkZFN0b3JlKHN0b3JlKSB7XG4gICAgdGhpcy5zdG9yZXMucHVzaChzdG9yZSk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEFjdGlvbnMge1xuICBjb25zdHJ1Y3RvcihhY3Rpb25zKSB7XG4gICAgdGhpcy5hbGwgPSBbXTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShhY3Rpb25zKSkge1xuICAgICAgYWN0aW9ucy5mb3JFYWNoKChhY3Rpb24gPT4gdGhpcy5hZGRBY3Rpb24oYWN0aW9uKSksIHRoaXMpO1xuICAgIH1cbiAgfVxuXG4gIGFkZEFjdGlvbihpdGVtLCBub092ZXJyaWRlKSB7XG4gICAgY29uc3QgYWN0aW9uID0gbm9PdmVycmlkZSA/IGZhbHNlIDogdGhpcy5kZXRlY3RBY3Rpb24oaXRlbSk7XG4gICAgaWYgKCFub092ZXJyaWRlKSB7XG4gICAgICBsZXQgb2xkID0gdGhpc1thY3Rpb24ubmFtZV07XG4gICAgICBpZiAob2xkKSB0aGlzLnJlbW92ZUFjdGlvbihvbGQpO1xuICAgICAgdGhpcy5hbGwucHVzaChhY3Rpb24pO1xuICAgICAgdGhpc1thY3Rpb24ubmFtZV0gPSBhY3Rpb24ucnVuLmJpbmQoYWN0aW9uKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYWN0aW9uO1xuICB9XG5cbiAgcmVtb3ZlQWN0aW9uKGl0ZW0pIHtcbiAgICBjb25zdCBhY3Rpb24gPSB0aGlzLmRldGVjdEFjdGlvbihpdGVtLCB0cnVlKTtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMuYWxsLmluZGV4T2YoYWN0aW9uKTtcbiAgICBpZiAoaW5kZXggIT09IC0xKSB0aGlzLmFsbC5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIGRlbGV0ZSB0aGlzW2FjdGlvbi5uYW1lXTtcbiAgfVxuXG4gIGFkZFN0b3JlKHN0b3JlKSB7XG4gICAgdGhpcy5hbGwuZm9yRWFjaChhY3Rpb24gPT4gYWN0aW9uLmFkZFN0b3JlKHN0b3JlKSk7XG4gIH1cblxuICBkZXRlY3RBY3Rpb24oYWN0aW9uLCBpc09sZCkge1xuICAgIGlmIChhY3Rpb24uY29uc3RydWN0b3IgPT09IEFjdGlvbikge1xuICAgICAgcmV0dXJuIGFjdGlvbjtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhY3Rpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gKGlzT2xkKSA/IHRoaXNbYWN0aW9uXSA6IG5ldyBBY3Rpb24oe25hbWU6IGFjdGlvbn0pO1xuICAgIH1cbiAgfVxufVxuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmUgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmpbXCJkZWZhdWx0XCJdIDogb2JqOyB9O1xuXG5leHBvcnRzLmNyZWF0ZVZpZXcgPSBjcmVhdGVWaWV3O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIFJlYWN0ID0gX2ludGVyb3BSZXF1aXJlKCh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydSZWFjdCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnUmVhY3QnXSA6IG51bGwpKTtcblxudmFyIFJlYWN0Um91dGVyID0gX2ludGVyb3BSZXF1aXJlKCh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydSZWFjdFJvdXRlciddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnUmVhY3RSb3V0ZXInXSA6IG51bGwpKTtcblxuZnVuY3Rpb24gZ2V0Um91dGVyKCkge1xuICB2YXIgUm91dGVyID0ge307XG4gIGlmICh0eXBlb2YgUmVhY3RSb3V0ZXIgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB2YXIgcm91dGVyRWxlbWVudHMgPSBbXCJSb3V0ZVwiLCBcIkRlZmF1bHRSb3V0ZVwiLCBcIlJvdXRlSGFuZGxlclwiLCBcIkFjdGl2ZUhhbmRsZXJcIiwgXCJOb3RGb3VuZFJvdXRlXCIsIFwiTGlua1wiLCBcIlJlZGlyZWN0XCJdLFxuICAgICAgICByb3V0ZXJNaXhpbnMgPSBbXCJOYXZpZ2F0aW9uXCIsIFwiU3RhdGVcIl0sXG4gICAgICAgIHJvdXRlckZ1bmN0aW9ucyA9IFtcImNyZWF0ZVwiLCBcImNyZWF0ZURlZmF1bHRSb3V0ZVwiLCBcImNyZWF0ZU5vdEZvdW5kUm91dGVcIiwgXCJjcmVhdGVSZWRpcmVjdFwiLCBcImNyZWF0ZVJvdXRlXCIsIFwiY3JlYXRlUm91dGVzRnJvbVJlYWN0Q2hpbGRyZW5cIiwgXCJydW5cIl0sXG4gICAgICAgIHJvdXRlck9iamVjdHMgPSBbXCJIYXNoTG9jYXRpb25cIiwgXCJIaXN0b3J5XCIsIFwiSGlzdG9yeUxvY2F0aW9uXCIsIFwiUmVmcmVzaExvY2F0aW9uXCIsIFwiU3RhdGljTG9jYXRpb25cIiwgXCJUZXN0TG9jYXRpb25cIiwgXCJJbWl0YXRlQnJvd3NlckJlaGF2aW9yXCIsIFwiU2Nyb2xsVG9Ub3BCZWhhdmlvclwiXSxcbiAgICAgICAgY29waWVkSXRlbXMgPSByb3V0ZXJNaXhpbnMuY29uY2F0KHJvdXRlckZ1bmN0aW9ucykuY29uY2F0KHJvdXRlck9iamVjdHMpO1xuXG4gICAgcm91dGVyRWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICAgICAgUm91dGVyW25hbWVdID0gUmVhY3QuY3JlYXRlRWxlbWVudC5iaW5kKFJlYWN0LCBSZWFjdFJvdXRlcltuYW1lXSk7XG4gICAgfSk7XG5cbiAgICBjb3BpZWRJdGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICBSb3V0ZXJbbmFtZV0gPSBSZWFjdFJvdXRlcltuYW1lXTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gUm91dGVyO1xufVxuXG5mdW5jdGlvbiBnZXRET00oKSB7XG4gIHZhciBET01IZWxwZXJzID0ge307XG5cbiAgaWYgKHR5cGVvZiBSZWFjdCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHZhciB0YWcgPSBmdW5jdGlvbiB0YWcobmFtZSkge1xuICAgICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuID4gMSA/IF9sZW4gLSAxIDogMCksIF9rZXkgPSAxOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICAgIGFyZ3NbX2tleSAtIDFdID0gYXJndW1lbnRzW19rZXldO1xuICAgICAgfVxuXG4gICAgICB2YXIgYXR0cmlidXRlcyA9IHVuZGVmaW5lZDtcbiAgICAgIHZhciBmaXJzdCA9IGFyZ3NbMF0gJiYgYXJnc1swXS5jb25zdHJ1Y3RvcjtcbiAgICAgIGlmIChmaXJzdCA9PT0gT2JqZWN0KSB7XG4gICAgICAgIGF0dHJpYnV0ZXMgPSBhcmdzLnNoaWZ0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhdHRyaWJ1dGVzID0ge307XG4gICAgICB9XG4gICAgICByZXR1cm4gUmVhY3QuRE9NW25hbWVdLmFwcGx5KFJlYWN0LkRPTSwgW2F0dHJpYnV0ZXNdLmNvbmNhdChhcmdzKSk7XG4gICAgfTtcblxuICAgIGZvciAodmFyIHRhZ05hbWUgaW4gUmVhY3QuRE9NKSB7XG4gICAgICBET01IZWxwZXJzW3RhZ05hbWVdID0gdGFnLmJpbmQodGhpcywgdGFnTmFtZSk7XG4gICAgfVxuXG4gICAgRE9NSGVscGVycy5zcGFjZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBSZWFjdC5ET00uc3Bhbih7XG4gICAgICAgIGRhbmdlcm91c2x5U2V0SW5uZXJIVE1MOiB7XG4gICAgICAgICAgX19odG1sOiBcIiZuYnNwO1wiXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIERPTUhlbHBlcnM7XG59XG5cbnZhciBSb3V0ZXIgPSBnZXRSb3V0ZXIoKTtcbmV4cG9ydHMuUm91dGVyID0gUm91dGVyO1xudmFyIERPTSA9IGdldERPTSgpO1xuXG5leHBvcnRzLkRPTSA9IERPTTtcblxuZnVuY3Rpb24gY3JlYXRlVmlldyhjbGFzc0FyZ3MpIHtcbiAgdmFyIFJlYWN0Q2xhc3MgPSBSZWFjdC5jcmVhdGVDbGFzcyhjbGFzc0FyZ3MpO1xuICB2YXIgUmVhY3RFbGVtZW50ID0gUmVhY3QuY3JlYXRlRWxlbWVudC5iaW5kKFJlYWN0LmNyZWF0ZUVsZW1lbnQsIFJlYWN0Q2xhc3MpO1xuICByZXR1cm4gUmVhY3RFbGVtZW50O1xufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSlcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0OnV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYklpOW9iMjFsTDJOb2NtbHpMMk52WkdVdlpYaHBiUzl6Y21NdlJFOU5TR1ZzY0dWeWN5NXFjeUpkTENKdVlXMWxjeUk2VzEwc0ltMWhjSEJwYm1keklqb2lPenM3T3p0UlFYZEVaMElzVlVGQlZTeEhRVUZXTEZWQlFWVTdPenM3TzBsQmVFUnVRaXhMUVVGTExESkNRVUZOTEU5QlFVODdPMGxCUTJ4Q0xGZEJRVmNzTWtKQlFVMHNZMEZCWXpzN1FVRkZkRU1zVTBGQlV5eFRRVUZUTEVkQlFVazdRVUZEY0VJc1RVRkJUU3hOUVVGTkxFZEJRVWNzUlVGQlJTeERRVUZETzBGQlEyeENMRTFCUVVrc1QwRkJUeXhYUVVGWExFdEJRVXNzVjBGQlZ5eEZRVUZGTzBGQlEzUkRMRkZCUVVrc1kwRkJZeXhIUVVGSExFTkJRVU1zVDBGQlR5eEZRVUZGTEdOQlFXTXNSVUZCUlN4alFVRmpMRVZCUVVVc1pVRkJaU3hGUVVGRkxHVkJRV1VzUlVGQlJTeE5RVUZOTEVWQlFVVXNWVUZCVlN4RFFVRkRPMUZCUTNCSUxGbEJRVmtzUjBGQlJ5eERRVUZETEZsQlFWa3NSVUZCUlN4UFFVRlBMRU5CUVVNN1VVRkRkRU1zWlVGQlpTeEhRVUZITEVOQlFVTXNVVUZCVVN4RlFVRkZMRzlDUVVGdlFpeEZRVUZGTEhGQ1FVRnhRaXhGUVVGRkxHZENRVUZuUWl4RlFVRkZMR0ZCUVdFc1JVRkJSU3dyUWtGQkswSXNSVUZCUlN4TFFVRkxMRU5CUVVNN1VVRkRiRW9zWVVGQllTeEhRVUZITEVOQlFVTXNZMEZCWXl4RlFVRkZMRk5CUVZNc1JVRkJSU3hwUWtGQmFVSXNSVUZCUlN4cFFrRkJhVUlzUlVGQlJTeG5Ra0ZCWjBJc1JVRkJSU3hqUVVGakxFVkJRVVVzZDBKQlFYZENMRVZCUVVVc2NVSkJRWEZDTEVOQlFVTTdVVUZEY0Vzc1YwRkJWeXhIUVVGSExGbEJRVmtzUTBGQlF5eE5RVUZOTEVOQlFVTXNaVUZCWlN4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExHRkJRV0VzUTBGQlF5eERRVUZET3p0QlFVVjZSU3hyUWtGQll5eERRVUZETEU5QlFVOHNRMEZCUXl4VlFVRlRMRWxCUVVrc1JVRkJSVHRCUVVOd1F5eFpRVUZOTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWRCUVVjc1MwRkJTeXhEUVVGRExHRkJRV0VzUTBGQlF5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RlFVRkZMRmRCUVZjc1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF5eERRVUZETzB0QlEyNUZMRU5CUVVNc1EwRkJRenM3UVVGRlNDeGxRVUZYTEVOQlFVTXNUMEZCVHl4RFFVRkRMRlZCUVZNc1NVRkJTU3hGUVVGRk8wRkJRMnBETEZsQlFVMHNRMEZCUXl4SlFVRkpMRU5CUVVNc1IwRkJSeXhYUVVGWExFTkJRVU1zU1VGQlNTeERRVUZETEVOQlFVTTdTMEZEYkVNc1EwRkJReXhEUVVGRE8wZEJRMG83UVVGRFJDeFRRVUZQTEUxQlFVMHNRMEZCUXp0RFFVTm1PenRCUVVWRUxGTkJRVk1zVFVGQlRTeEhRVUZKTzBGQlEycENMRTFCUVUwc1ZVRkJWU3hIUVVGSExFVkJRVVVzUTBGQlF6czdRVUZGZEVJc1RVRkJTU3hQUVVGUExFdEJRVXNzUzBGQlN5eFhRVUZYTEVWQlFVVTdRVUZEYUVNc1VVRkJTU3hIUVVGSExFZEJRVWNzWVVGQlZTeEpRVUZKTEVWQlFWYzdkME5CUVU0c1NVRkJTVHRCUVVGS0xGbEJRVWs3T3p0QlFVTXZRaXhWUVVGSkxGVkJRVlVzV1VGQlFTeERRVUZETzBGQlEyWXNWVUZCU1N4TFFVRkxMRWRCUVVjc1NVRkJTU3hEUVVGRExFTkJRVU1zUTBGQlF5eEpRVUZKTEVsQlFVa3NRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhYUVVGWExFTkJRVU03UVVGRE0wTXNWVUZCU1N4TFFVRkxMRXRCUVVzc1RVRkJUU3hGUVVGRk8wRkJRM0JDTEd0Q1FVRlZMRWRCUVVjc1NVRkJTU3hEUVVGRExFdEJRVXNzUlVGQlJTeERRVUZETzA5QlF6TkNMRTFCUVUwN1FVRkRUQ3hyUWtGQlZTeEhRVUZITEVWQlFVVXNRMEZCUXp0UFFVTnFRanRCUVVORUxHRkJRVThzUzBGQlN5eERRVUZETEVkQlFVY3NRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJReXhMUVVGTExFTkJRVU1zUzBGQlN5eERRVUZETEVkQlFVY3NSVUZCUlN4RFFVRkRMRlZCUVZVc1EwRkJReXhEUVVGRExFMUJRVTBzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXl4RFFVRkRPMHRCUTNCRkxFTkJRVU03TzBGQlJVWXNVMEZCU3l4SlFVRkpMRTlCUVU4c1NVRkJTU3hMUVVGTExFTkJRVU1zUjBGQlJ5eEZRVUZGTzBGQlF6ZENMR2RDUVVGVkxFTkJRVU1zVDBGQlR5eERRVUZETEVkQlFVY3NSMEZCUnl4RFFVRkRMRWxCUVVrc1EwRkJReXhKUVVGSkxFVkJRVVVzVDBGQlR5eERRVUZETEVOQlFVTTdTMEZETDBNN08wRkJSVVFzWTBGQlZTeERRVUZETEV0QlFVc3NSMEZCUnl4WlFVRlhPMEZCUXpWQ0xHRkJRVThzUzBGQlN5eERRVUZETEVkQlFVY3NRMEZCUXl4SlFVRkpMRU5CUVVNN1FVRkRjRUlzSzBKQlFYVkNMRVZCUVVVN1FVRkRka0lzWjBKQlFVMHNSVUZCUlN4UlFVRlJPMU5CUTJwQ08wOUJRMFlzUTBGQlF5eERRVUZETzB0QlEwb3NRMEZCUXp0SFFVTklPMEZCUTBRc1UwRkJUeXhWUVVGVkxFTkJRVU03UTBGRGJrSTdPMEZCUlUwc1NVRkJUU3hOUVVGTkxFZEJRVWNzVTBGQlV5eEZRVUZGTEVOQlFVTTdVVUZCY2tJc1RVRkJUU3hIUVVGT0xFMUJRVTA3UVVGRFdpeEpRVUZOTEVkQlFVY3NSMEZCUnl4TlFVRk5MRVZCUVVVc1EwRkJRenM3VVVGQlppeEhRVUZITEVkQlFVZ3NSMEZCUnpzN1FVRkZWQ3hUUVVGVExGVkJRVlVzUTBGQlJTeFRRVUZUTEVWQlFVVTdRVUZEY2tNc1RVRkJTU3hWUVVGVkxFZEJRVWNzUzBGQlN5eERRVUZETEZkQlFWY3NRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJRenRCUVVNNVF5eE5RVUZKTEZsQlFWa3NSMEZCUnl4TFFVRkxMRU5CUVVNc1lVRkJZU3hEUVVGRExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNZVUZCWVN4RlFVRkZMRlZCUVZVc1EwRkJReXhEUVVGRE8wRkJRemRGTEZOQlFVOHNXVUZCV1N4RFFVRkRPME5CUTNKQ0lpd2labWxzWlNJNkltZGxibVZ5WVhSbFpDNXFjeUlzSW5OdmRYSmpaVkp2YjNRaU9pSWlMQ0p6YjNWeVkyVnpRMjl1ZEdWdWRDSTZXeUpwYlhCdmNuUWdVbVZoWTNRZ1puSnZiU0FuY21WaFkzUW5PMXh1YVcxd2IzSjBJRkpsWVdOMFVtOTFkR1Z5SUdaeWIyMGdKM0psWVdOMExYSnZkWFJsY2ljN1hHNWNibVoxYm1OMGFXOXVJR2RsZEZKdmRYUmxjaUFvS1NCN1hHNGdJR052Ym5OMElGSnZkWFJsY2lBOUlIdDlPMXh1SUNCcFppQW9kSGx3Wlc5bUlGSmxZV04wVW05MWRHVnlJQ0U5UFNBbmRXNWtaV1pwYm1Wa0p5a2dlMXh1SUNBZ0lHeGxkQ0J5YjNWMFpYSkZiR1Z0Wlc1MGN5QTlJRnNuVW05MWRHVW5MQ0FuUkdWbVlYVnNkRkp2ZFhSbEp5d2dKMUp2ZFhSbFNHRnVaR3hsY2ljc0lDZEJZM1JwZG1WSVlXNWtiR1Z5Snl3Z0owNXZkRVp2ZFc1a1VtOTFkR1VuTENBblRHbHVheWNzSUNkU1pXUnBjbVZqZENkZExGeHVJQ0FnSUhKdmRYUmxjazFwZUdsdWN5QTlJRnNuVG1GMmFXZGhkR2x2Ymljc0lDZFRkR0YwWlNkZExGeHVJQ0FnSUhKdmRYUmxja1oxYm1OMGFXOXVjeUE5SUZzblkzSmxZWFJsSnl3Z0oyTnlaV0YwWlVSbFptRjFiSFJTYjNWMFpTY3NJQ2RqY21WaGRHVk9iM1JHYjNWdVpGSnZkWFJsSnl3Z0oyTnlaV0YwWlZKbFpHbHlaV04wSnl3Z0oyTnlaV0YwWlZKdmRYUmxKeXdnSjJOeVpXRjBaVkp2ZFhSbGMwWnliMjFTWldGamRFTm9hV3hrY21WdUp5d2dKM0oxYmlkZExGeHVJQ0FnSUhKdmRYUmxjazlpYW1WamRITWdQU0JiSjBoaGMyaE1iMk5oZEdsdmJpY3NJQ2RJYVhOMGIzSjVKeXdnSjBocGMzUnZjbmxNYjJOaGRHbHZiaWNzSUNkU1pXWnlaWE5vVEc5allYUnBiMjRuTENBblUzUmhkR2xqVEc5allYUnBiMjRuTENBblZHVnpkRXh2WTJGMGFXOXVKeXdnSjBsdGFYUmhkR1ZDY205M2MyVnlRbVZvWVhacGIzSW5MQ0FuVTJOeWIyeHNWRzlVYjNCQ1pXaGhkbWx2Y2lkZExGeHVJQ0FnSUdOdmNHbGxaRWwwWlcxeklEMGdjbTkxZEdWeVRXbDRhVzV6TG1OdmJtTmhkQ2h5YjNWMFpYSkdkVzVqZEdsdmJuTXBMbU52Ym1OaGRDaHliM1YwWlhKUFltcGxZM1J6S1R0Y2JseHVJQ0FnSUhKdmRYUmxja1ZzWlcxbGJuUnpMbVp2Y2tWaFkyZ29ablZ1WTNScGIyNG9ibUZ0WlNrZ2UxeHVJQ0FnSUNBZ1VtOTFkR1Z5VzI1aGJXVmRJRDBnVW1WaFkzUXVZM0psWVhSbFJXeGxiV1Z1ZEM1aWFXNWtLRkpsWVdOMExDQlNaV0ZqZEZKdmRYUmxjbHR1WVcxbFhTazdYRzRnSUNBZ2ZTazdYRzVjYmlBZ0lDQmpiM0JwWldSSmRHVnRjeTVtYjNKRllXTm9LR1oxYm1OMGFXOXVLRzVoYldVcElIdGNiaUFnSUNBZ0lGSnZkWFJsY2x0dVlXMWxYU0E5SUZKbFlXTjBVbTkxZEdWeVcyNWhiV1ZkTzF4dUlDQWdJSDBwTzF4dUlDQjlYRzRnSUhKbGRIVnliaUJTYjNWMFpYSTdYRzU5WEc1Y2JtWjFibU4wYVc5dUlHZGxkRVJQVFNBb0tTQjdYRzRnSUdOdmJuTjBJRVJQVFVobGJIQmxjbk1nUFNCN2ZUdGNibHh1SUNCcFppQW9kSGx3Wlc5bUlGSmxZV04wSUNFOVBTQW5kVzVrWldacGJtVmtKeWtnZTF4dUlDQWdJR3hsZENCMFlXY2dQU0JtZFc1amRHbHZiaUFvYm1GdFpTd2dMaTR1WVhKbmN5a2dlMXh1SUNBZ0lDQWdiR1YwSUdGMGRISnBZblYwWlhNN1hHNGdJQ0FnSUNCc1pYUWdabWx5YzNRZ1BTQmhjbWR6V3pCZElDWW1JR0Z5WjNOYk1GMHVZMjl1YzNSeWRXTjBiM0k3WEc0Z0lDQWdJQ0JwWmlBb1ptbHljM1FnUFQwOUlFOWlhbVZqZENrZ2UxeHVJQ0FnSUNBZ0lDQmhkSFJ5YVdKMWRHVnpJRDBnWVhKbmN5NXphR2xtZENncE8xeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ1lYUjBjbWxpZFhSbGN5QTlJSHQ5TzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnY21WMGRYSnVJRkpsWVdOMExrUlBUVnR1WVcxbFhTNWhjSEJzZVNoU1pXRmpkQzVFVDAwc0lGdGhkSFJ5YVdKMWRHVnpYUzVqYjI1allYUW9ZWEpuY3lrcE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCbWIzSWdLR3hsZENCMFlXZE9ZVzFsSUdsdUlGSmxZV04wTGtSUFRTa2dlMXh1SUNBZ0lDQWdSRTlOU0dWc2NHVnljMXQwWVdkT1lXMWxYU0E5SUhSaFp5NWlhVzVrS0hSb2FYTXNJSFJoWjA1aGJXVXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lFUlBUVWhsYkhCbGNuTXVjM0JoWTJVZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQlNaV0ZqZEM1RVQwMHVjM0JoYmloN1hHNGdJQ0FnSUNBZ0lHUmhibWRsY205MWMyeDVVMlYwU1c1dVpYSklWRTFNT2lCN1hHNGdJQ0FnSUNBZ0lDQWdYMTlvZEcxc09pQW5KbTVpYzNBN0oxeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlPMXh1SUNCOVhHNGdJSEpsZEhWeWJpQkVUMDFJWld4d1pYSnpPMXh1ZlZ4dVhHNWxlSEJ2Y25RZ1kyOXVjM1FnVW05MWRHVnlJRDBnWjJWMFVtOTFkR1Z5S0NrN1hHNWxlSEJ2Y25RZ1kyOXVjM1FnUkU5TklEMGdaMlYwUkU5TktDazdYRzVjYm1WNGNHOXlkQ0JtZFc1amRHbHZiaUJqY21WaGRHVldhV1YzSUNoamJHRnpjMEZ5WjNNcElIdGNiaUFnYkdWMElGSmxZV04wUTJ4aGMzTWdQU0JTWldGamRDNWpjbVZoZEdWRGJHRnpjeWhqYkdGemMwRnlaM01wTzF4dUlDQnNaWFFnVW1WaFkzUkZiR1Z0Wlc1MElEMGdVbVZoWTNRdVkzSmxZWFJsUld4bGJXVnVkQzVpYVc1a0tGSmxZV04wTG1OeVpXRjBaVVZzWlcxbGJuUXNJRkpsWVdOMFEyeGhjM01wTzF4dUlDQnlaWFIxY200Z1VtVmhZM1JGYkdWdFpXNTBPMXh1ZlZ4dUlsMTkiLCJleHBvcnQgZGVmYXVsdCBjbGFzcyB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX2xpc3RlbmVycyA9IFtdO1xuICB9XG5cbiAgZmluZExpc3RlbmVySW5kZXgobGlzdGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fbGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuICB9XG5cbiAgX2FkZExpc3RlbmVyKGxpc3RlbmVyLCBjb250ZXh0KSB7XG4gICAgbGV0IGZvdW5kID0gdGhpcy5maW5kTGlzdGVuZXJJbmRleChsaXN0ZW5lcikgPj0gMDtcbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICBpZiAoY29udGV4dCkgbGlzdGVuZXIuX2N0eCA9IGNvbnRleHQ7XG4gICAgICB0aGlzLl9saXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgX3JlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKSB7XG4gICAgbGV0IGluZGV4LCBmb3VuZCA9IChpbmRleCA9IHRoaXMuZmluZExpc3RlbmVySW5kZXgobGlzdGVuZXIpKSA+PSAwO1xuICAgIGlmIChmb3VuZCkge1xuICAgICAgdGhpcy5fbGlzdGVuZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZW1pdCgpIHtcbiAgICB0aGlzLl9saXN0ZW5lcnMuZm9yRWFjaChsaXN0ZW5lciA9PiBsaXN0ZW5lci5fY3R4ID8gbGlzdGVuZXIuY2FsbChsaXN0ZW5lci5fY3R4KSA6IGxpc3RlbmVyKCkpO1xuICB9XG59XG4iLCJpbXBvcnQgRW1pdHRlciBmcm9tICcuL0VtaXR0ZXInO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgZ2V0Q29ubmVjdE1peGluIGZyb20gJy4vbWl4aW5zL2Nvbm5lY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHZXR0ZXIgZXh0ZW5kcyBFbWl0dGVyIHtcbiAgY29uc3RydWN0b3Ioc3RvcmUpIHtcbiAgICBzdXBlcigpO1xuXG4gICAgLy8gQ29weSBhbGxvd2VkIHByb3BzIHRvIGdldHRlci5cbiAgICBjb25maWcuYWxsb3dlZEdldHRlclByb3BzLmZvckVhY2gocHJvcCA9PiB0aGlzW3Byb3BdID0gc3RvcmVbcHJvcF0pO1xuXG4gICAgLy8gQ29uc2lzdGVudCBuYW1lcyBmb3IgZW1pdHRlciBtZXRob2RzLlxuICAgIFt0aGlzLm9uQ2hhbmdlLCB0aGlzLm9mZkNoYW5nZV0gPSBbdGhpcy5fYWRkTGlzdGVuZXIsIHRoaXMuX3JlbW92ZUxpc3RlbmVyXTtcblxuICAgIC8vIENvbm5lY3QgbWl4aW4gYmluZGVkIHRvIGdldHRlci5cbiAgICB0aGlzLmNvbm5lY3QgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgcmV0dXJuIGdldENvbm5lY3RNaXhpbi5hcHBseShudWxsLCBbdGhpc10uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuICB9XG59XG4iLCJpbXBvcnQge0FjdGlvbnN9IGZyb20gJy4vQWN0aW9ucyc7XG5pbXBvcnQgR2V0dGVyIGZyb20gJy4vR2V0dGVyJztcbmltcG9ydCB1dGlscyBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3RvcmUge1xuICBjb25zdHJ1Y3RvcihhcmdzPXt9KSB7XG4gICAgbGV0IHthY3Rpb25zLCBpbml0aWFsfSA9IGFyZ3M7XG4gICAgdGhpcy5pbml0aWFsID0gaW5pdGlhbCA9IHR5cGVvZiBpbml0aWFsID09PSAnZnVuY3Rpb24nID8gaW5pdGlhbCgpIDogaW5pdGlhbDtcbiAgICBjb25zdCBzdG9yZSA9IGluaXRpYWwgPyBPYmplY3QuY3JlYXRlKGluaXRpYWwpIDoge307XG5cbiAgICBsZXQgcHJpdmF0ZU1ldGhvZHM7XG4gICAgaWYgKCFhcmdzLnByaXZhdGVNZXRob2RzKSB7XG4gICAgICBwcml2YXRlTWV0aG9kcyA9IG5ldyBTZXQoKTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoYXJncy5wcml2YXRlTWV0aG9kcykpIHtcbiAgICAgIHByaXZhdGVNZXRob2RzID0gbmV3IFNldCgpO1xuICAgICAgLy8gcHJpdmF0ZSBzZXQgaXMgdW5kZWZpbmVkXG4gICAgICAvLyBhcmdzLnByaXZhdGVNZXRob2RzLmZvckVhY2gobSA9PiBwcml2YXRlU2V0LmFkZChtKSk7XG4gICAgICAvLyBhcmdzLnByaXZhdGVNZXRob2RzID0gcHJpdmF0ZVNldDtcbiAgICB9IGVsc2UgaWYgKGFyZ3MucHJpdmF0ZU1ldGhvZHMuY29uc3RydWN0b3IgPT09IFNldCkge1xuICAgICAgcHJpdmF0ZU1ldGhvZHMgPSBhcmdzLnByaXZhdGVNZXRob2RzO1xuICAgIH1cbiAgICB0aGlzLnByaXZhdGVNZXRob2RzID0gcHJpdmF0ZU1ldGhvZHM7XG5cbiAgICB0aGlzLmhhbmRsZXJzID0gYXJncy5oYW5kbGVycyB8fCB1dGlscy5nZXRXaXRob3V0RmllbGRzKFsnYWN0aW9ucyddLCBhcmdzKSB8fCB7fTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KGFjdGlvbnMpKSB7XG4gICAgICB0aGlzLmFjdGlvbnMgPSBhY3Rpb25zID0gbmV3IEFjdGlvbnMoYWN0aW9ucyk7XG4gICAgICB0aGlzLmFjdGlvbnMuYWRkU3RvcmUodGhpcyk7XG4gICAgfVxuXG4gICAgbGV0IF90aGlzID0gdGhpcztcblxuICAgIGNvbnN0IHNldFZhbHVlID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgIGNvbnN0IGNvcnJlY3RBcmdzID0gWydrZXknLCAndmFsdWUnXS5ldmVyeShpdGVtID0+IHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJyk7XG4gICAgICByZXR1cm4gKGNvcnJlY3RBcmdzKSA/IHN0b3JlW2tleV0gPSB2YWx1ZSA6IGZhbHNlO1xuICAgIH07XG5cbiAgICBjb25zdCBnZXRWYWx1ZSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIHJldHVybiBrZXkgPyBzdG9yZVtrZXldIDogT2JqZWN0LmNyZWF0ZShzdG9yZSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHJlbW92ZVZhbHVlID0gZnVuY3Rpb24gKGtleSkge1xuICAgICAgbGV0IHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgIGlmICgha2V5KSB7XG4gICAgICAgIGZvciAobGV0IGtleSBpbiBzdG9yZSkge1xuICAgICAgICAgIHN1Y2Nlc3MgPSBzdG9yZVtrZXldICYmIGRlbGV0ZSBzdG9yZVtrZXldO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgIHN1Y2Nlc3MgPSBzdG9yZVtrZXldICYmIGRlbGV0ZSBzdG9yZVtrZXldO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN1Y2Nlc3M7XG4gICAgfTtcblxuICAgIGNvbnN0IHNldCA9IGZ1bmN0aW9uIChpdGVtLCB2YWx1ZSwgb3B0aW9ucz17fSkge1xuICAgICAgaWYgKHV0aWxzLmlzT2JqZWN0KGl0ZW0pKSB7XG4gICAgICAgIGlmICh1dGlscy5pc09iamVjdCh2YWx1ZSkpIG9wdGlvbnMgPSB2YWx1ZTtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIGl0ZW0pIHtcbiAgICAgICAgICBzZXRWYWx1ZShrZXksIGl0ZW1ba2V5XSwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNldFZhbHVlKGl0ZW0sIHZhbHVlLCBvcHRpb25zKTtcbiAgICAgIH1cbiAgICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgICAgX3RoaXMuZ2V0dGVyLmVtaXQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgZ2V0ID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIGl0ZW0gPT09ICdudW1iZXInKSB7XG4gICAgICAgIHJldHVybiBnZXRWYWx1ZShpdGVtKTtcbiAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShpdGVtKSkge1xuICAgICAgICByZXR1cm4gaXRlbS5tYXAoa2V5ID0+IGdldFZhbHVlKGtleSkpO1xuICAgICAgfSBlbHNlIGlmICghaXRlbSkge1xuICAgICAgICByZXR1cm4gZ2V0VmFsdWUoKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSB7fTtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIGl0ZW0pIHtcbiAgICAgICAgICBsZXQgdmFsID0gaXRlbVtrZXldO1xuICAgICAgICAgIGxldCB0eXBlID0gdHlwZW9mIHZhbDtcbiAgICAgICAgICBpZiAodHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmVzdWx0W2tleV0gPSBpdGVtW2tleV0oZ2V0VmFsdWUoa2V5KSk7XG4gICAgICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3N0aW5nJykge1xuICAgICAgICAgICAgcmVzdWx0W2tleV0gPSBnZXRWYWx1ZShrZXkpW3ZhbF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHJlc2V0ID0gZnVuY3Rpb24gKGl0ZW0sIG9wdGlvbnM9e30pIHtcbiAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgIHNldFZhbHVlKGl0ZW0sIGluaXRpYWxbaXRlbV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVtb3ZlVmFsdWUoaXRlbSk7XG4gICAgICB9XG4gICAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgIF90aGlzLmdldHRlci5lbWl0KCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuc2V0ID0gc2V0O1xuICAgIHRoaXMuZ2V0ID0gZ2V0O1xuICAgIHRoaXMucmVzZXQgPSByZXNldDtcblxuICAgIHRoaXMuc3RhdGVQcm90byA9IHtzZXQsIGdldCwgcmVzZXQsIGFjdGlvbnN9O1xuICAgIHRoaXMuZ2V0dGVyID0gbmV3IEdldHRlcih0aGlzKTtcbiAgICByZXR1cm4gdGhpcy5nZXR0ZXI7XG4gIH1cblxuICBhZGRBY3Rpb24oaXRlbSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICB0aGlzLmFjdGlvbnMgPSB0aGlzLmFjdGlvbnMuY29uY2F0KHRoaXMuYWN0aW9ucyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHRoaXMuYWN0aW9ucy5wdXNoKGl0ZW0pO1xuICAgIH1cbiAgfVxuXG4gIHJlbW92ZUFjdGlvbihpdGVtKSB7XG4gICAgdmFyIGFjdGlvbjtcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICBhY3Rpb24gPSB0aGlzLmZpbmRCeU5hbWUoJ2FjdGlvbnMnLCAnbmFtZScsIGl0ZW0pO1xuICAgICAgaWYgKGFjdGlvbikgYWN0aW9uLnJlbW92ZVN0b3JlKHRoaXMpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnKSB7XG4gICAgICBhY3Rpb24gPSBpdGVtO1xuICAgICAgbGV0IGluZGV4ID0gdGhpcy5hY3Rpb25zLmluZGV4T2YoYWN0aW9uKTtcbiAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgYWN0aW9uLnJlbW92ZVN0b3JlKHRoaXMpO1xuICAgICAgICB0aGlzLmFjdGlvbnMgPSB0aGlzLmFjdGlvbnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXRBY3Rpb25DeWNsZShhY3Rpb25OYW1lLCBwcmVmaXg9J29uJykge1xuICAgIGNvbnN0IGNhcGl0YWxpemVkID0gdXRpbHMuY2FwaXRhbGl6ZShhY3Rpb25OYW1lKTtcbiAgICBjb25zdCBmdWxsQWN0aW9uTmFtZSA9IGAke3ByZWZpeH0ke2NhcGl0YWxpemVkfWA7XG4gICAgY29uc3QgaGFuZGxlciA9IHRoaXMuaGFuZGxlcnNbZnVsbEFjdGlvbk5hbWVdIHx8IHRoaXMuaGFuZGxlcnNbYWN0aW9uTmFtZV07XG4gICAgaWYgKCFoYW5kbGVyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGhhbmRsZXJzIGZvciAke2FjdGlvbk5hbWV9IGFjdGlvbiBkZWZpbmVkIGluIGN1cnJlbnQgc3RvcmVgKTtcbiAgICB9XG5cbiAgICBsZXQgYWN0aW9ucztcbiAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdvYmplY3QnKSB7XG4gICAgICBhY3Rpb25zID0gaGFuZGxlcjtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBhY3Rpb25zID0ge29uOiBoYW5kbGVyfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2hhbmRsZXJ9IG11c3QgYmUgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uYCk7XG4gICAgfVxuICAgIHJldHVybiBhY3Rpb25zO1xuICB9XG5cbiAgLy8gMS4gd2lsbChpbml0aWFsKSA9PiB3aWxsUmVzdWx0XG4gIC8vIDIuIHdoaWxlKHRydWUpXG4gIC8vIDMuIG9uKHdpbGxSZXN1bHQgfHwgaW5pdGlhbCkgPT4gb25SZXN1bHRcbiAgLy8gNC4gd2hpbGUoZmFsc2UpXG4gIC8vIDUuIGRpZChvblJlc3VsdClcbiAgcnVuQ3ljbGUoYWN0aW9uTmFtZSwgLi4uYXJncykge1xuICAgIC8vIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gcmVzb2x2ZSh0cnVlKSlcbiAgICBjb25zdCBjeWNsZSA9IHRoaXMuZ2V0QWN0aW9uQ3ljbGUoYWN0aW9uTmFtZSk7XG4gICAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgICBsZXQgd2lsbCA9IGN5Y2xlLndpbGwsIHdoaWxlXyA9IGN5Y2xlLndoaWxlLCBvbl8gPSBjeWNsZS5vbjtcbiAgICBsZXQgZGlkID0gY3ljbGUuZGlkLCBkaWROb3QgPSBjeWNsZS5kaWROb3Q7XG5cbiAgICAvLyBMb2NhbCBzdGF0ZSBmb3IgdGhpcyBjeWNsZS5cbiAgICBsZXQgc3RhdGUgPSBPYmplY3QuY3JlYXRlKHRoaXMuc3RhdGVQcm90byk7XG5cbiAgICAvLyBQcmUtY2hlY2sgJiBwcmVwYXJhdGlvbnMuXG4gICAgaWYgKHdpbGwpIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgcmV0dXJuIHdpbGwuYXBwbHkoc3RhdGUsIGFyZ3MpO1xuICAgIH0pO1xuXG4gICAgLy8gU3RhcnQgd2hpbGUoKS5cbiAgICBpZiAod2hpbGVfKSBwcm9taXNlID0gcHJvbWlzZS50aGVuKCh3aWxsUmVzdWx0KSA9PiB7XG4gICAgICB3aGlsZV8uY2FsbChzdGF0ZSwgdHJ1ZSk7XG4gICAgICByZXR1cm4gd2lsbFJlc3VsdDtcbiAgICB9KTtcblxuICAgIC8vIEFjdHVhbCBleGVjdXRpb24uXG4gICAgcHJvbWlzZSA9IHByb21pc2UudGhlbigod2lsbFJlc3VsdCkgPT4ge1xuICAgICAgaWYgKHdpbGxSZXN1bHQgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gb25fLmFwcGx5KHN0YXRlLCBhcmdzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvbl8uY2FsbChzdGF0ZSwgd2lsbFJlc3VsdCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBTdG9wIHdoaWxlKCkuXG4gICAgaWYgKHdoaWxlXykgcHJvbWlzZSA9IHByb21pc2UudGhlbigob25SZXN1bHQpID0+IHtcbiAgICAgIHdoaWxlXy5jYWxsKHN0YXRlLCBmYWxzZSk7XG4gICAgICByZXR1cm4gb25SZXN1bHQ7XG4gICAgfSk7XG5cbiAgICAvLyBGb3IgZGlkIGFuZCBkaWROb3Qgc3RhdGUgaXMgZnJlZXplZC5cbiAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKChvblJlc3VsdCkgPT4ge1xuICAgICAgT2JqZWN0LmZyZWV6ZShzdGF0ZSk7XG4gICAgICByZXR1cm4gb25SZXN1bHQ7XG4gICAgfSk7XG5cbiAgICAvLyBIYW5kbGUgdGhlIHJlc3VsdC5cbiAgICBpZiAoZGlkKSBwcm9taXNlID0gcHJvbWlzZS50aGVuKG9uUmVzdWx0ID0+IHtcbiAgICAgIHJldHVybiBkaWQuY2FsbChzdGF0ZSwgb25SZXN1bHQpO1xuICAgIH0pO1xuXG4gICAgcHJvbWlzZS5jYXRjaChlcnJvciA9PiB7XG4gICAgICBpZiAod2hpbGVfKSB3aGlsZV8uY2FsbChzdGF0ZSwgZmFsc2UpO1xuICAgICAgaWYgKGRpZE5vdCkge1xuICAgICAgICBkaWROb3QuY2FsbChzdGF0ZSwgZXJyb3IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbiAgfVxufVxuIiwiZXhwb3J0IGRlZmF1bHQge1xuICBhbGxvd2VkR2V0dGVyUHJvcHM6IFsnZ2V0JywgJ2luaXRpYWwnLCAnYWN0aW9ucyddXG59O1xuIiwiZXhwb3J0IGRlZmF1bHQge1xuICBjeDogZnVuY3Rpb24gKGNsYXNzTmFtZXMpIHtcbiAgICBpZiAodHlwZW9mIGNsYXNzTmFtZXMgPT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhjbGFzc05hbWVzKS5maWx0ZXIoZnVuY3Rpb24oY2xhc3NOYW1lKSB7XG4gICAgICAgIHJldHVybiBjbGFzc05hbWVzW2NsYXNzTmFtZV07XG4gICAgICB9KS5qb2luKCcgJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuam9pbi5jYWxsKGFyZ3VtZW50cywgJyAnKTtcbiAgICB9XG4gIH1cbn07XG4iLCJpbXBvcnQgdXRpbHMgZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBnZXRDb25uZWN0TWl4aW4gKHN0b3JlLCAuLi5rZXkpIHtcbiAgbGV0IGdldFN0YXRlRnJvbUFycmF5ID0gZnVuY3Rpb24gKHNvdXJjZSwgYXJyYXkpIHtcbiAgICBsZXQgc3RhdGUgPSB7fTtcbiAgICBhcnJheS5mb3JFYWNoKGsgPT4ge1xuICAgICAgaWYgKHR5cGVvZiBrID09PSAnc3RyaW5nJykge1xuICAgICAgICAvLyBjb25uZWN0KCdpdGVtTmFtZScpXG4gICAgICAgIHN0YXRlW2tdID0gc291cmNlLmdldChrKTtcbiAgICAgIH0gZWxzZSBpZiAodXRpbHMuaXNPYmplY3QoaykpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoaykuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgICBpZiAodHlwZW9mIGtbbmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIC8vIGNvbm5lY3Qoe2RhdGE6IGZ1bmN0aW9uIChkKSB7cmV0dXJuIGQubmFtZX19KVxuICAgICAgICAgICAgc3RhdGVba10gPSBrW25hbWVdKHNvdXJjZS5nZXQoaykpO1xuICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGtbbmFtZV0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAvLyBjb25uZWN0KHtuYW1lSW5TdG9yZTogbmFtZUluQ29tcG9uZW50fSlcbiAgICAgICAgICAgIHN0YXRlW2tbbmFtZV1dID0gc291cmNlLmdldChuYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzdGF0ZTtcbiAgfTtcblxuICBsZXQgZ2V0U3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGtleS5sZW5ndGgpIHtcbiAgICAgICAgLy8gZ2V0IHZhbHVlcyBmcm9tIGFycmF5bFxuICAgICAgcmV0dXJuIGdldFN0YXRlRnJvbUFycmF5KHN0b3JlLCBrZXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBnZXQgYWxsIHZhbHVlc1xuICAgICAgcmV0dXJuIHN0b3JlLmdldCgpO1xuICAgIH1cbiAgfTtcblxuICBsZXQgY2hhbmdlQ2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRTdGF0ZShnZXRTdGF0ZSgpKTtcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGdldFN0YXRlKCk7XG4gICAgfSxcblxuICAgIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICBzdG9yZS5vbkNoYW5nZShjaGFuZ2VDYWxsYmFjaywgdGhpcyk7XG4gICAgfSxcblxuICAgIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICBzdG9yZS5vZmZDaGFuZ2UoY2hhbmdlQ2FsbGJhY2spO1xuICAgIH1cbiAgfTtcbn1cbiIsImNvbnN0IHV0aWxzID0ge307XG5cbnV0aWxzLmdldFdpdGhvdXRGaWVsZHMgPSBmdW5jdGlvbiAob3V0Y2FzdCwgdGFyZ2V0KSB7XG4gIGlmICghdGFyZ2V0KSB0aHJvdyBuZXcgRXJyb3IoJ1R5cGVFcnJvcjogdGFyZ2V0IGlzIG5vdCBhbiBvYmplY3QuJyk7XG4gIHZhciByZXN1bHQgPSB7fTtcbiAgaWYgKHR5cGVvZiBvdXRjYXN0ID09PSAnc3RyaW5nJykgb3V0Y2FzdCA9IFtvdXRjYXN0XTtcbiAgdmFyIHRLZXlzID0gT2JqZWN0LmtleXModGFyZ2V0KTtcbiAgb3V0Y2FzdC5mb3JFYWNoKGZ1bmN0aW9uKGZpZWxkTmFtZSkge1xuICAgIHRLZXlzXG4gICAgICAuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5ICE9PSBmaWVsZE5hbWU7XG4gICAgICB9KVxuICAgICAgLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdGFyZ2V0W2tleV07XG4gICAgICB9KTtcbiAgfSk7XG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG51dGlscy5vYmplY3RUb0FycmF5ID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICByZXR1cm4gT2JqZWN0LmtleXMob2JqZWN0KS5tYXAoa2V5ID0+IG9iamVjdFtrZXldKTtcbn07XG5cbnV0aWxzLmNsYXNzV2l0aEFyZ3MgPSBmdW5jdGlvbiAoSXRlbSwgYXJncykge1xuICByZXR1cm4gSXRlbS5iaW5kLmFwcGx5KEl0ZW0sW0l0ZW1dLmNvbmNhdChhcmdzKSk7XG59O1xuXG4vLyAxLiB3aWxsXG4vLyAyLiB3aGlsZSh0cnVlKVxuLy8gMy4gb25cbi8vIDQuIHdoaWxlKGZhbHNlKVxuLy8gNS4gZGlkIG9yIGRpZE5vdFxudXRpbHMubWFwQWN0aW9uTmFtZXMgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgY29uc3QgbGlzdCA9IFtdO1xuICBjb25zdCBwcmVmaXhlcyA9IFsnd2lsbCcsICd3aGlsZVN0YXJ0JywgJ29uJywgJ3doaWxlRW5kJywgJ2RpZCcsICdkaWROb3QnXTtcbiAgcHJlZml4ZXMuZm9yRWFjaChpdGVtID0+IHtcbiAgICBsZXQgbmFtZSA9IGl0ZW07XG4gICAgaWYgKGl0ZW0gPT09ICd3aGlsZVN0YXJ0JyB8fCBpdGVtID09PSAnd2hpbGVFbmQnKSB7XG4gICAgICBuYW1lID0gJ3doaWxlJztcbiAgICB9XG4gICAgaWYgKG9iamVjdFtuYW1lXSkge1xuICAgICAgbGlzdC5wdXNoKFtpdGVtLCBvYmplY3RbbmFtZV1dKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gbGlzdDtcbn07XG5cbnV0aWxzLmlzT2JqZWN0ID0gZnVuY3Rpb24gKHRhcmcpIHtcbiAgcmV0dXJuIHRhcmcgPyB0YXJnLnRvU3RyaW5nKCkuc2xpY2UoOCwxNCkgPT09ICdPYmplY3QnIDogZmFsc2U7XG59O1xudXRpbHMuY2FwaXRhbGl6ZSA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgY29uc3QgZmlyc3QgPSBzdHIuY2hhckF0KDApLnRvVXBwZXJDYXNlKCk7XG4gIGNvbnN0IHJlc3QgPSBzdHIuc2xpY2UoMSk7XG4gIHJldHVybiBgJHtmaXJzdH0ke3Jlc3R9YDtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHV0aWxzO1xuIl19
