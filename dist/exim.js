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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9jaHJpcy9jb2RlL2V4aW0vc3JjL2luZGV4LmpzIiwiL2hvbWUvY2hyaXMvY29kZS9leGltL3NyYy9BY3Rpb25zLmpzIiwic3JjL0RPTUhlbHBlcnMuanMiLCIvaG9tZS9jaHJpcy9jb2RlL2V4aW0vc3JjL0VtaXR0ZXIuanMiLCIvaG9tZS9jaHJpcy9jb2RlL2V4aW0vc3JjL0dldHRlci5qcyIsIi9ob21lL2NocmlzL2NvZGUvZXhpbS9zcmMvU3RvcmUuanMiLCIvaG9tZS9jaHJpcy9jb2RlL2V4aW0vc3JjL2NvbmZpZy5qcyIsIi9ob21lL2NocmlzL2NvZGUvZXhpbS9zcmMvaGVscGVycy5qcyIsIi9ob21lL2NocmlzL2NvZGUvZXhpbS9zcmMvbWl4aW5zL2Nvbm5lY3QuanMiLCIvaG9tZS9jaHJpcy9jb2RlL2V4aW0vc3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozt1QkNBOEIsV0FBVzs7SUFBakMsTUFBTSxZQUFOLE1BQU07SUFBRSxPQUFPLFlBQVAsT0FBTzs7SUFDaEIsS0FBSywyQkFBTSxTQUFTOztJQUNwQixPQUFPLDJCQUFNLFdBQVc7OzBCQUNPLGNBQWM7O0lBQTVDLFVBQVUsZUFBVixVQUFVO0lBQUUsTUFBTSxlQUFOLE1BQU07SUFBRSxHQUFHLGVBQUgsR0FBRzs7QUFFL0IsSUFBTSxJQUFJLEdBQUcsRUFBQyxNQUFNLEVBQU4sTUFBTSxFQUFFLE9BQU8sRUFBUCxPQUFPLEVBQUUsS0FBSyxFQUFMLEtBQUssRUFBRSxNQUFNLEVBQU4sTUFBTSxFQUFFLEdBQUcsRUFBSCxHQUFHLEVBQUUsT0FBTyxFQUFQLE9BQU8sRUFBRSxVQUFVLEVBQVYsVUFBVSxFQUFDLENBQUM7O0FBRXhFLElBQUksQ0FBQyxZQUFZLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDbEMsU0FBTyxJQUFJLE1BQU0s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QUksQ0FBQyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2pDO0dBQ0YsQ0FBQyxDQUFDO0FBQ0gsU0FBTyxJQUFJLENBQUM7Q0FDYixDQUFDOztBQUVGLEtBQUssQ0FBQyxRQUFRLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDL0IsU0FBTyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEtBQUssUUFBUSxHQUFHLEtBQUssQ0FBQztDQUNoRSxDQUFDO0FBQ0YsS0FBSyxDQUFDLFVBQVUsR0FBRyxVQUFVLEdBQUcsRUFBRTtBQUNoQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUIsY0FBVSxLQUFLLFFBQUcsSUFBSSxDQUFHO0NBQzFCLENBQUM7O2lCQUVhLEtBQUsiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IHtBY3Rpb24sIEFjdGlvbnN9IGZyb20gJy4vQWN0aW9ucyc7XG5pbXBvcnQgU3RvcmUgZnJvbSAnLi9TdG9yZSc7XG5pbXBvcnQgaGVscGVycyBmcm9tICcuL2hlbHBlcnMnO1xuaW1wb3J0IHtjcmVhdGVWaWV3LCBSb3V0ZXIsIERPTX0gZnJvbSAnLi9ET01IZWxwZXJzJztcblxuY29uc3QgRXhpbSA9IHtBY3Rpb24sIEFjdGlvbnMsIFN0b3JlLCBSb3V0ZXIsIERPTSwgaGVscGVycywgY3JlYXRlVmlld307XG5cbkV4aW0uY3JlYXRlQWN0aW9uID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgcmV0dXJuIG5ldyBBY3Rpb24oYXJncyk7XG59O1xuXG5FeGltLmNyZWF0ZUFjdGlvbnMgPSBmdW5jdGlvbiAoYXJncykge1xuICByZXR1cm4gbmV3IEFjdGlvbnMoYXJncyk7XG59O1xuXG5FeGltLmNyZWF0ZVN0b3JlID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgcmV0dXJuIG5ldyBTdG9yZShhcmdzKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IEV4aW07XG4iLCJleHBvcnQgY2xhc3MgQWN0aW9uIHtcbiAgY29uc3RydWN0b3IoYXJncykge1xuICAgIGNvbnN0IFtzdG9yZSwgc3RvcmVzLCBhbGxTdG9yZXNdID0gW2FyZ3Muc3RvcmUsIGFyZ3Muc3RvcmVzLCBbXV07XG4gICAgdGhpcy5uYW1lID0gYXJncy5uYW1lO1xuXG4gICAgaWYgKHN0b3JlKSBhbGxTdG9yZXMucHVzaChzdG9yZSk7XG4gICAgaWYgKHN0b3JlcykgYWxsU3RvcmVzLnB1c2guYXBwbHkoYWxsU3RvcmVzLCBzdG9yZXMpO1xuXG4gICAgdGhpcy5zdG9yZXMgPSBhbGxTdG9yZXM7XG4gIH1cblxuICBydW4oLi4uYXJncykge1xuICAgIGNvbnN0IHN0b3Jlc0N5Y2xlcyA9IHRoaXMuc3RvcmVzLm1hcChzdG9yZSA9PlxuICAgICAgc3RvcmUucnVuQ3ljbGUuYXBwbHkoc3RvcmUsIFt0aGlzLm5hbWVdLmNvbmNhdChhcmdzKSlcbiAgICApO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzdG9yZXNDeWNsZXMpO1xuICB9XG5cbiAgYWRkU3RvcmUoc3RvcmUpIHtcbiAgICB0aGlzLnN0b3Jlcy5wdXNoKHN0b3JlKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQWN0aW9ucyB7XG4gIGNvbnN0cnVjdG9yKGFjdGlvbnMpIHtcbiAgICB0aGlzLmFsbCA9IFtdO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGFjdGlvbnMpKSB7XG4gICAgICBhY3Rpb25zLmZvckVhY2goKGFjdGlvbiA9PiB0aGlzLmFkZEFjdGlvbihhY3Rpb24pKSwgdGhpcyk7XG4gICAgfVxuICB9XG5cbiAgYWRkQWN0aW9uKGl0ZW0sIG5vT3ZlcnJpZGUpIHtcbiAgICBjb25zdCBhY3Rpb24gPSBub092ZXJyaWRlID8gZmFsc2UgOiB0aGlzLmRldGVjdEFjdGlvbihpdGVtKTtcbiAgICBpZiAoIW5vT3ZlcnJpZGUpIHtcbiAgICAgIGxldCBvbGQgPSB0aGlzW2FjdGlvbi5uYW1lXTtcbiAgICAgIGlmIChvbGQpIHRoaXMucmVtb3ZlQWN0aW9uKG9sZCk7XG4gICAgICB0aGlzLmFsbC5wdXNoKGFjdGlvbik7XG4gICAgICB0aGlzW2FjdGlvbi5uYW1lXSA9IGFjdGlvbi5ydW4uYmluZChhY3Rpb24pO1xuICAgIH1cblxuICAgIHJldHVybiBhY3Rpb247XG4gIH1cblxuICByZW1vdmVBY3Rpb24oaXRlbSkge1xuICAgIGNvbnN0IGFjdGlvbiA9IHRoaXMuZGV0ZWN0QWN0aW9uKGl0ZW0sIHRydWUpO1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5hbGwuaW5kZXhPZihhY3Rpb24pO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHRoaXMuYWxsLnNwbGljZShpbmRleCwgMSk7XG4gICAgZGVsZXRlIHRoaXNbYWN0aW9uLm5hbWVdO1xuICB9XG5cbiAgYWRkU3RvcmUoc3RvcmUpIHtcbiAgICB0aGlzLmFsbC5mb3JFYWNoKGFjdGlvbiA9PiBhY3Rpb24uYWRkU3RvcmUoc3RvcmUpKTtcbiAgfVxuXG4gIGRldGVjdEFjdGlvbihhY3Rpb24sIGlzT2xkKSB7XG4gICAgaWYgKGFjdGlvbi5jb25zdHJ1Y3RvciA9PT0gQWN0aW9uKSB7XG4gICAgICByZXR1cm4gYWN0aW9uO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFjdGlvbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiAoaXNPbGQpID8gdGhpc1thY3Rpb25dIDogbmV3IEFjdGlvbih7bmFtZTogYWN0aW9ufSk7XG4gICAgfVxuICB9XG59XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF9pbnRlcm9wUmVxdWlyZSA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9ialtcImRlZmF1bHRcIl0gOiBvYmo7IH07XG5cbmV4cG9ydHMuY3JlYXRlVmlldyA9IGNyZWF0ZVZpZXc7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgUmVhY3QgPSBfaW50ZXJvcFJlcXVpcmUoKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1JlYWN0J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSZWFjdCddIDogbnVsbCkpO1xuXG52YXIgUmVhY3RSb3V0ZXIgPSBfaW50ZXJvcFJlcXVpcmUoKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1JlYWN0Um91dGVyJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSZWFjdFJvdXRlciddIDogbnVsbCkpO1xuXG5mdW5jdGlvbiBnZXRSb3V0ZXIoKSB7XG4gIHZhciBSb3V0ZXIgPSB7fTtcbiAgaWYgKHR5cGVvZiBSZWFjdFJvdXRlciAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHZhciByb3V0ZXJFbGVtZW50cyA9IFtcIlJvdXRlXCIsIFwiRGVmYXVsdFJvdXRlXCIsIFwiUm91dGVIYW5kbGVyXCIsIFwiQWN0aXZlSGFuZGxlclwiLCBcIk5vdEZvdW5kUm91dGVcIiwgXCJMaW5rXCIsIFwiUmVkaXJlY3RcIl0sXG4gICAgICAgIHJvdXRlck1peGlucyA9IFtcIk5hdmlnYXRpb25cIiwgXCJTdGF0ZVwiXSxcbiAgICAgICAgcm91dGVyRnVuY3Rpb25zID0gW1wiY3JlYXRlXCIsIFwiY3JlYXRlRGVmYXVsdFJvdXRlXCIsIFwiY3JlYXRlTm90Rm91bmRSb3V0ZVwiLCBcImNyZWF0ZVJlZGlyZWN0XCIsIFwiY3JlYXRlUm91dGVcIiwgXCJjcmVhdGVSb3V0ZXNGcm9tUmVhY3RDaGlsZHJlblwiLCBcInJ1blwiXSxcbiAgICAgICAgcm91dGVyT2JqZWN0cyA9IFtcIkhhc2hMb2NhdGlvblwiLCBcIkhpc3RvcnlcIiwgXCJIaXN0b3J5TG9jYXRpb25cIiwgXCJSZWZyZXNoTG9jYXRpb25cIiwgXCJTdGF0aWNMb2NhdGlvblwiLCBcIlRlc3RMb2NhdGlvblwiLCBcIkltaXRhdGVCcm93c2VyQmVoYXZpb3JcIiwgXCJTY3JvbGxUb1RvcEJlaGF2aW9yXCJdLFxuICAgICAgICBjb3BpZWRJdGVtcyA9IHJvdXRlck1peGlucy5jb25jYXQocm91dGVyRnVuY3Rpb25zKS5jb25jYXQocm91dGVyT2JqZWN0cyk7XG5cbiAgICByb3V0ZXJFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICBSb3V0ZXJbbmFtZV0gPSBSZWFjdC5jcmVhdGVFbGVtZW50LmJpbmQoUmVhY3QsIFJlYWN0Um91dGVyW25hbWVdKTtcbiAgICB9KTtcblxuICAgIGNvcGllZEl0ZW1zLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgIFJvdXRlcltuYW1lXSA9IFJlYWN0Um91dGVyW25hbWVdO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBSb3V0ZXI7XG59XG5cbmZ1bmN0aW9uIGdldERPTSgpIHtcbiAgdmFyIERPTUhlbHBlcnMgPSB7fTtcblxuICBpZiAodHlwZW9mIFJlYWN0ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgdmFyIHRhZyA9IGZ1bmN0aW9uIHRhZyhuYW1lKSB7XG4gICAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4gPiAxID8gX2xlbiAtIDEgOiAwKSwgX2tleSA9IDE7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgICAgYXJnc1tfa2V5IC0gMV0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgICB9XG5cbiAgICAgIHZhciBhdHRyaWJ1dGVzID0gdW5kZWZpbmVkO1xuICAgICAgdmFyIGZpcnN0ID0gYXJnc1swXSAmJiBhcmdzWzBdLmNvbnN0cnVjdG9yO1xuICAgICAgaWYgKGZpcnN0ID09PSBPYmplY3QpIHtcbiAgICAgICAgYXR0cmlidXRlcyA9IGFyZ3Muc2hpZnQoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF0dHJpYnV0ZXMgPSB7fTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBSZWFjdC5ET01bbmFtZV0uYXBwbHkoUmVhY3QuRE9NLCBbYXR0cmlidXRlc10uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuXG4gICAgZm9yICh2YXIgdGFnTmFtZSBpbiBSZWFjdC5ET00pIHtcbiAgICAgIERPTUhlbHBlcnNbdGFnTmFtZV0gPSB0YWcuYmluZCh0aGlzLCB0YWdOYW1lKTtcbiAgICB9XG5cbiAgICBET01IZWxwZXJzLnNwYWNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIFJlYWN0LkRPTS5zcGFuKHtcbiAgICAgICAgZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUw6IHtcbiAgICAgICAgICBfX2h0bWw6IFwiJm5ic3A7XCJcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gRE9NSGVscGVycztcbn1cblxudmFyIFJvdXRlciA9IGdldFJvdXRlcigpO1xuZXhwb3J0cy5Sb3V0ZXIgPSBSb3V0ZXI7XG52YXIgRE9NID0gZ2V0RE9NKCk7XG5cbmV4cG9ydHMuRE9NID0gRE9NO1xuXG5mdW5jdGlvbiBjcmVhdGVWaWV3KGNsYXNzQXJncykge1xuICB2YXIgUmVhY3RDbGFzcyA9IFJlYWN0LmNyZWF0ZUNsYXNzKGNsYXNzQXJncyk7XG4gIHZhciBSZWFjdEVsZW1lbnQgPSBSZWFjdC5jcmVhdGVFbGVtZW50LmJpbmQoUmVhY3QuY3JlYXRlRWxlbWVudCwgUmVhY3RDbGFzcyk7XG4gIHJldHVybiBSZWFjdEVsZW1lbnQ7XG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ6dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSWk5b2IyMWxMMk5vY21sekwyTnZaR1V2WlhocGJTOXpjbU12UkU5TlNHVnNjR1Z5Y3k1cWN5SmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaU96czdPenRSUVhkRVowSXNWVUZCVlN4SFFVRldMRlZCUVZVN096czdPMGxCZUVSdVFpeExRVUZMTERKQ1FVRk5MRTlCUVU4N08wbEJRMnhDTEZkQlFWY3NNa0pCUVUwc1kwRkJZenM3UVVGRmRFTXNVMEZCVXl4VFFVRlRMRWRCUVVrN1FVRkRjRUlzVFVGQlRTeE5RVUZOTEVkQlFVY3NSVUZCUlN4RFFVRkRPMEZCUTJ4Q0xFMUJRVWtzVDBGQlR5eFhRVUZYTEV0QlFVc3NWMEZCVnl4RlFVRkZPMEZCUTNSRExGRkJRVWtzWTBGQll5eEhRVUZITEVOQlFVTXNUMEZCVHl4RlFVRkZMR05CUVdNc1JVRkJSU3hqUVVGakxFVkJRVVVzWlVGQlpTeEZRVUZGTEdWQlFXVXNSVUZCUlN4TlFVRk5MRVZCUVVVc1ZVRkJWU3hEUVVGRE8xRkJRM0JJTEZsQlFWa3NSMEZCUnl4RFFVRkRMRmxCUVZrc1JVRkJSU3hQUVVGUExFTkJRVU03VVVGRGRFTXNaVUZCWlN4SFFVRkhMRU5CUVVNc1VVRkJVU3hGUVVGRkxHOUNRVUZ2UWl4RlFVRkZMSEZDUVVGeFFpeEZRVUZGTEdkQ1FVRm5RaXhGUVVGRkxHRkJRV0VzUlVGQlJTd3JRa0ZCSzBJc1JVRkJSU3hMUVVGTExFTkJRVU03VVVGRGJFb3NZVUZCWVN4SFFVRkhMRU5CUVVNc1kwRkJZeXhGUVVGRkxGTkJRVk1zUlVGQlJTeHBRa0ZCYVVJc1JVRkJSU3hwUWtGQmFVSXNSVUZCUlN4blFrRkJaMElzUlVGQlJTeGpRVUZqTEVWQlFVVXNkMEpCUVhkQ0xFVkJRVVVzY1VKQlFYRkNMRU5CUVVNN1VVRkRjRXNzVjBGQlZ5eEhRVUZITEZsQlFWa3NRMEZCUXl4TlFVRk5MRU5CUVVNc1pVRkJaU3hEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEdGQlFXRXNRMEZCUXl4RFFVRkRPenRCUVVWNlJTeHJRa0ZCWXl4RFFVRkRMRTlCUVU4c1EwRkJReXhWUVVGVExFbEJRVWtzUlVGQlJUdEJRVU53UXl4WlFVRk5MRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUzBGQlN5eERRVUZETEdGQlFXRXNRMEZCUXl4SlFVRkpMRU5CUVVNc1MwRkJTeXhGUVVGRkxGZEJRVmNzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXl4RFFVRkRPMHRCUTI1RkxFTkJRVU1zUTBGQlF6czdRVUZGU0N4bFFVRlhMRU5CUVVNc1QwRkJUeXhEUVVGRExGVkJRVk1zU1VGQlNTeEZRVUZGTzBGQlEycERMRmxCUVUwc1EwRkJReXhKUVVGSkxFTkJRVU1zUjBGQlJ5eFhRVUZYTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNN1MwRkRiRU1zUTBGQlF5eERRVUZETzBkQlEwbzdRVUZEUkN4VFFVRlBMRTFCUVUwc1EwRkJRenREUVVObU96dEJRVVZFTEZOQlFWTXNUVUZCVFN4SFFVRkpPMEZCUTJwQ0xFMUJRVTBzVlVGQlZTeEhRVUZITEVWQlFVVXNRMEZCUXpzN1FVRkZkRUlzVFVGQlNTeFBRVUZQTEV0QlFVc3NTMEZCU3l4WFFVRlhMRVZCUVVVN1FVRkRhRU1zVVVGQlNTeEhRVUZITEVkQlFVY3NZVUZCVlN4SlFVRkpMRVZCUVZjN2QwTkJRVTRzU1VGQlNUdEJRVUZLTEZsQlFVazdPenRCUVVNdlFpeFZRVUZKTEZWQlFWVXNXVUZCUVN4RFFVRkRPMEZCUTJZc1ZVRkJTU3hMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETEVOQlFVTXNRMEZCUXl4SlFVRkpMRWxCUVVrc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eFhRVUZYTEVOQlFVTTdRVUZETTBNc1ZVRkJTU3hMUVVGTExFdEJRVXNzVFVGQlRTeEZRVUZGTzBGQlEzQkNMR3RDUVVGVkxFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NSVUZCUlN4RFFVRkRPMDlCUXpOQ0xFMUJRVTA3UVVGRFRDeHJRa0ZCVlN4SFFVRkhMRVZCUVVVc1EwRkJRenRQUVVOcVFqdEJRVU5FTEdGQlFVOHNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF5eExRVUZMTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1JVRkJSU3hEUVVGRExGVkJRVlVzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJReXhEUVVGRE8wdEJRM0JGTEVOQlFVTTdPMEZCUlVZc1UwRkJTeXhKUVVGSkxFOUJRVThzU1VGQlNTeExRVUZMTEVOQlFVTXNSMEZCUnl4RlFVRkZPMEZCUXpkQ0xHZENRVUZWTEVOQlFVTXNUMEZCVHl4RFFVRkRMRWRCUVVjc1IwRkJSeXhEUVVGRExFbEJRVWtzUTBGQlF5eEpRVUZKTEVWQlFVVXNUMEZCVHl4RFFVRkRMRU5CUVVNN1MwRkRMME03TzBGQlJVUXNZMEZCVlN4RFFVRkRMRXRCUVVzc1IwRkJSeXhaUVVGWE8wRkJRelZDTEdGQlFVOHNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhKUVVGSkxFTkJRVU03UVVGRGNFSXNLMEpCUVhWQ0xFVkJRVVU3UVVGRGRrSXNaMEpCUVUwc1JVRkJSU3hSUVVGUk8xTkJRMnBDTzA5QlEwWXNRMEZCUXl4RFFVRkRPMHRCUTBvc1EwRkJRenRIUVVOSU8wRkJRMFFzVTBGQlR5eFZRVUZWTEVOQlFVTTdRMEZEYmtJN08wRkJSVTBzU1VGQlRTeE5RVUZOTEVkQlFVY3NVMEZCVXl4RlFVRkZMRU5CUVVNN1VVRkJja0lzVFVGQlRTeEhRVUZPTEUxQlFVMDdRVUZEV2l4SlFVRk5MRWRCUVVjc1IwRkJSeXhOUVVGTkxFVkJRVVVzUTBGQlF6czdVVUZCWml4SFFVRkhMRWRCUVVnc1IwRkJSenM3UVVGRlZDeFRRVUZUTEZWQlFWVXNRMEZCUlN4VFFVRlRMRVZCUVVVN1FVRkRja01zVFVGQlNTeFZRVUZWTEVkQlFVY3NTMEZCU3l4RFFVRkRMRmRCUVZjc1EwRkJReXhUUVVGVExFTkJRVU1zUTBGQlF6dEJRVU01UXl4TlFVRkpMRmxCUVZrc1IwRkJSeXhMUVVGTExFTkJRVU1zWVVGQllTeERRVUZETEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1lVRkJZU3hGUVVGRkxGVkJRVlVzUTBGQlF5eERRVUZETzBGQlF6ZEZMRk5CUVU4c1dVRkJXU3hEUVVGRE8wTkJRM0pDSWl3aVptbHNaU0k2SW1kbGJtVnlZWFJsWkM1cWN5SXNJbk52ZFhKalpWSnZiM1FpT2lJaUxDSnpiM1Z5WTJWelEyOXVkR1Z1ZENJNld5SnBiWEJ2Y25RZ1VtVmhZM1FnWm5KdmJTQW5jbVZoWTNRbk8xeHVhVzF3YjNKMElGSmxZV04wVW05MWRHVnlJR1p5YjIwZ0ozSmxZV04wTFhKdmRYUmxjaWM3WEc1Y2JtWjFibU4wYVc5dUlHZGxkRkp2ZFhSbGNpQW9LU0I3WEc0Z0lHTnZibk4wSUZKdmRYUmxjaUE5SUh0OU8xeHVJQ0JwWmlBb2RIbHdaVzltSUZKbFlXTjBVbTkxZEdWeUlDRTlQU0FuZFc1a1pXWnBibVZrSnlrZ2UxeHVJQ0FnSUd4bGRDQnliM1YwWlhKRmJHVnRaVzUwY3lBOUlGc25VbTkxZEdVbkxDQW5SR1ZtWVhWc2RGSnZkWFJsSnl3Z0oxSnZkWFJsU0dGdVpHeGxjaWNzSUNkQlkzUnBkbVZJWVc1a2JHVnlKeXdnSjA1dmRFWnZkVzVrVW05MWRHVW5MQ0FuVEdsdWF5Y3NJQ2RTWldScGNtVmpkQ2RkTEZ4dUlDQWdJSEp2ZFhSbGNrMXBlR2x1Y3lBOUlGc25UbUYyYVdkaGRHbHZiaWNzSUNkVGRHRjBaU2RkTEZ4dUlDQWdJSEp2ZFhSbGNrWjFibU4wYVc5dWN5QTlJRnNuWTNKbFlYUmxKeXdnSjJOeVpXRjBaVVJsWm1GMWJIUlNiM1YwWlNjc0lDZGpjbVZoZEdWT2IzUkdiM1Z1WkZKdmRYUmxKeXdnSjJOeVpXRjBaVkpsWkdseVpXTjBKeXdnSjJOeVpXRjBaVkp2ZFhSbEp5d2dKMk55WldGMFpWSnZkWFJsYzBaeWIyMVNaV0ZqZEVOb2FXeGtjbVZ1Snl3Z0ozSjFiaWRkTEZ4dUlDQWdJSEp2ZFhSbGNrOWlhbVZqZEhNZ1BTQmJKMGhoYzJoTWIyTmhkR2x2Ymljc0lDZElhWE4wYjNKNUp5d2dKMGhwYzNSdmNubE1iMk5oZEdsdmJpY3NJQ2RTWldaeVpYTm9URzlqWVhScGIyNG5MQ0FuVTNSaGRHbGpURzlqWVhScGIyNG5MQ0FuVkdWemRFeHZZMkYwYVc5dUp5d2dKMGx0YVhSaGRHVkNjbTkzYzJWeVFtVm9ZWFpwYjNJbkxDQW5VMk55YjJ4c1ZHOVViM0JDWldoaGRtbHZjaWRkTEZ4dUlDQWdJR052Y0dsbFpFbDBaVzF6SUQwZ2NtOTFkR1Z5VFdsNGFXNXpMbU52Ym1OaGRDaHliM1YwWlhKR2RXNWpkR2x2Ym5NcExtTnZibU5oZENoeWIzVjBaWEpQWW1wbFkzUnpLVHRjYmx4dUlDQWdJSEp2ZFhSbGNrVnNaVzFsYm5SekxtWnZja1ZoWTJnb1puVnVZM1JwYjI0b2JtRnRaU2tnZTF4dUlDQWdJQ0FnVW05MWRHVnlXMjVoYldWZElEMGdVbVZoWTNRdVkzSmxZWFJsUld4bGJXVnVkQzVpYVc1a0tGSmxZV04wTENCU1pXRmpkRkp2ZFhSbGNsdHVZVzFsWFNrN1hHNGdJQ0FnZlNrN1hHNWNiaUFnSUNCamIzQnBaV1JKZEdWdGN5NW1iM0pGWVdOb0tHWjFibU4wYVc5dUtHNWhiV1VwSUh0Y2JpQWdJQ0FnSUZKdmRYUmxjbHR1WVcxbFhTQTlJRkpsWVdOMFVtOTFkR1Z5VzI1aGJXVmRPMXh1SUNBZ0lIMHBPMXh1SUNCOVhHNGdJSEpsZEhWeWJpQlNiM1YwWlhJN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUdkbGRFUlBUU0FvS1NCN1hHNGdJR052Ym5OMElFUlBUVWhsYkhCbGNuTWdQU0I3ZlR0Y2JseHVJQ0JwWmlBb2RIbHdaVzltSUZKbFlXTjBJQ0U5UFNBbmRXNWtaV1pwYm1Wa0p5a2dlMXh1SUNBZ0lHeGxkQ0IwWVdjZ1BTQm1kVzVqZEdsdmJpQW9ibUZ0WlN3Z0xpNHVZWEpuY3lrZ2UxeHVJQ0FnSUNBZ2JHVjBJR0YwZEhKcFluVjBaWE03WEc0Z0lDQWdJQ0JzWlhRZ1ptbHljM1FnUFNCaGNtZHpXekJkSUNZbUlHRnlaM05iTUYwdVkyOXVjM1J5ZFdOMGIzSTdYRzRnSUNBZ0lDQnBaaUFvWm1seWMzUWdQVDA5SUU5aWFtVmpkQ2tnZTF4dUlDQWdJQ0FnSUNCaGRIUnlhV0oxZEdWeklEMGdZWEpuY3k1emFHbG1kQ2dwTzF4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnWVhSMGNtbGlkWFJsY3lBOUlIdDlPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdjbVYwZFhKdUlGSmxZV04wTGtSUFRWdHVZVzFsWFM1aGNIQnNlU2hTWldGamRDNUVUMDBzSUZ0aGRIUnlhV0oxZEdWelhTNWpiMjVqWVhRb1lYSm5jeWtwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0JtYjNJZ0tHeGxkQ0IwWVdkT1lXMWxJR2x1SUZKbFlXTjBMa1JQVFNrZ2UxeHVJQ0FnSUNBZ1JFOU5TR1ZzY0dWeWMxdDBZV2RPWVcxbFhTQTlJSFJoWnk1aWFXNWtLSFJvYVhNc0lIUmhaMDVoYldVcE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUVSUFRVaGxiSEJsY25NdWMzQmhZMlVnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCU1pXRmpkQzVFVDAwdWMzQmhiaWg3WEc0Z0lDQWdJQ0FnSUdSaGJtZGxjbTkxYzJ4NVUyVjBTVzV1WlhKSVZFMU1PaUI3WEc0Z0lDQWdJQ0FnSUNBZ1gxOW9kRzFzT2lBbkptNWljM0E3SjF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOUtUdGNiaUFnSUNCOU8xeHVJQ0I5WEc0Z0lISmxkSFZ5YmlCRVQwMUlaV3h3WlhKek8xeHVmVnh1WEc1bGVIQnZjblFnWTI5dWMzUWdVbTkxZEdWeUlEMGdaMlYwVW05MWRHVnlLQ2s3WEc1bGVIQnZjblFnWTI5dWMzUWdSRTlOSUQwZ1oyVjBSRTlOS0NrN1hHNWNibVY0Y0c5eWRDQm1kVzVqZEdsdmJpQmpjbVZoZEdWV2FXVjNJQ2hqYkdGemMwRnlaM01wSUh0Y2JpQWdiR1YwSUZKbFlXTjBRMnhoYzNNZ1BTQlNaV0ZqZEM1amNtVmhkR1ZEYkdGemN5aGpiR0Z6YzBGeVozTXBPMXh1SUNCc1pYUWdVbVZoWTNSRmJHVnRaVzUwSUQwZ1VtVmhZM1F1WTNKbFlYUmxSV3hsYldWdWRDNWlhVzVrS0ZKbFlXTjBMbU55WldGMFpVVnNaVzFsYm5Rc0lGSmxZV04wUTJ4aGMzTXBPMXh1SUNCeVpYUjFjbTRnVW1WaFkzUkZiR1Z0Wlc1ME8xeHVmVnh1SWwxOSIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5fbGlzdGVuZXJzID0gW107XG4gIH1cblxuICBmaW5kTGlzdGVuZXJJbmRleChsaXN0ZW5lcikge1xuICAgIHJldHVybiB0aGlzLl9saXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcik7XG4gIH1cblxuICBfYWRkTGlzdGVuZXIobGlzdGVuZXIsIGNvbnRleHQpIHtcbiAgICBsZXQgZm91bmQgPSB0aGlzLmZpbmRMaXN0ZW5lckluZGV4KGxpc3RlbmVyKSA+PSAwO1xuICAgIGlmICghZm91bmQpIHtcbiAgICAgIGlmIChjb250ZXh0KSBsaXN0ZW5lci5fY3R4ID0gY29udGV4dDtcbiAgICAgIHRoaXMuX2xpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBfcmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpIHtcbiAgICBsZXQgaW5kZXgsIGZvdW5kID0gKGluZGV4ID0gdGhpcy5maW5kTGlzdGVuZXJJbmRleChsaXN0ZW5lcikpID49IDA7XG4gICAgaWYgKGZvdW5kKSB7XG4gICAgICB0aGlzLl9saXN0ZW5lcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBlbWl0KCkge1xuICAgIHRoaXMuX2xpc3RlbmVycy5mb3JFYWNoKGxpc3RlbmVyID0+IGxpc3RlbmVyLl9jdHggPyBsaXN0ZW5lci5jYWxsKGxpc3RlbmVyLl9jdHgpIDogbGlzdGVuZXIoKSk7XG4gIH1cbn1cbiIsImltcG9ydCBFbWl0dGVyIGZyb20gJy4vRW1pdHRlcic7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBnZXRDb25uZWN0TWl4aW4gZnJvbSAnLi9taXhpbnMvY29ubmVjdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdldHRlciBleHRlbmRzIEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihzdG9yZSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICAvLyBDb3B5IGFsbG93ZWQgcHJvcHMgdG8gZ2V0dGVyLlxuICAgIGNvbmZpZy5hbGxvd2VkR2V0dGVyUHJvcHMuZm9yRWFjaChwcm9wID0+IHRoaXNbcHJvcF0gPSBzdG9yZVtwcm9wXSk7XG5cbiAgICAvLyBDb25zaXN0ZW50IG5hbWVzIGZvciBlbWl0dGVyIG1ldGhvZHMuXG4gICAgW3RoaXMub25DaGFuZ2UsIHRoaXMub2ZmQ2hhbmdlXSA9IFt0aGlzLl9hZGRMaXN0ZW5lciwgdGhpcy5fcmVtb3ZlTGlzdGVuZXJdO1xuXG4gICAgLy8gQ29ubmVjdCBtaXhpbiBiaW5kZWQgdG8gZ2V0dGVyLlxuICAgIHRoaXMuY29ubmVjdCA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICByZXR1cm4gZ2V0Q29ubmVjdE1peGluLmFwcGx5KG51bGwsIFt0aGlzXS5jb25jYXQoYXJncykpO1xuICAgIH07XG4gIH1cbn1cbiIsImltcG9ydCB7QWN0aW9uc30gZnJvbSAnLi9BY3Rpb25zJztcbmltcG9ydCBHZXR0ZXIgZnJvbSAnLi9HZXR0ZXInO1xuaW1wb3J0IHV0aWxzIGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTdG9yZSB7XG4gIGNvbnN0cnVjdG9yKGFyZ3M9e30pIHtcbiAgICBsZXQge2FjdGlvbnMsIGluaXRpYWx9ID0gYXJncztcbiAgICB0aGlzLmluaXRpYWwgPSBpbml0aWFsID0gdHlwZW9mIGluaXRpYWwgPT09ICdmdW5jdGlvbicgPyBpbml0aWFsKCkgOiBpbml0aWFsO1xuICAgIGNvbnN0IHN0b3JlID0gaW5pdGlhbCA/IE9iamVjdC5hc3NpZ24oaW5pdGlhbCkgOiB7fTtcblxuICAgIGxldCBwcml2YXRlTWV0aG9kcztcbiAgICBpZiAoIWFyZ3MucHJpdmF0ZU1ldGhvZHMpIHtcbiAgICAgIHByaXZhdGVNZXRob2RzID0gbmV3IFNldCgpO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShhcmdzLnByaXZhdGVNZXRob2RzKSkge1xuICAgICAgcHJpdmF0ZU1ldGhvZHMgPSBuZXcgU2V0KCk7XG4gICAgICAvLyBwcml2YXRlIHNldCBpcyB1bmRlZmluZWRcbiAgICAgIC8vIGFyZ3MucHJpdmF0ZU1ldGhvZHMuZm9yRWFjaChtID0+IHByaXZhdGVTZXQuYWRkKG0pKTtcbiAgICAgIC8vIGFyZ3MucHJpdmF0ZU1ldGhvZHMgPSBwcml2YXRlU2V0O1xuICAgIH0gZWxzZSBpZiAoYXJncy5wcml2YXRlTWV0aG9kcy5jb25zdHJ1Y3RvciA9PT0gU2V0KSB7XG4gICAgICBwcml2YXRlTWV0aG9kcyA9IGFyZ3MucHJpdmF0ZU1ldGhvZHM7XG4gICAgfVxuICAgIHRoaXMucHJpdmF0ZU1ldGhvZHMgPSBwcml2YXRlTWV0aG9kcztcblxuICAgIHRoaXMuaGFuZGxlcnMgPSBhcmdzLmhhbmRsZXJzIHx8IHV0aWxzLmdldFdpdGhvdXRGaWVsZHMoWydhY3Rpb25zJ10sIGFyZ3MpIHx8IHt9O1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYWN0aW9ucykpIHtcbiAgICAgIHRoaXMuYWN0aW9ucyA9IGFjdGlvbnMgPSBuZXcgQWN0aW9ucyhhY3Rpb25zKTtcbiAgICAgIHRoaXMuYWN0aW9ucy5hZGRTdG9yZSh0aGlzKTtcbiAgICB9XG5cbiAgICBsZXQgX3RoaXMgPSB0aGlzO1xuXG4gICAgY29uc3Qgc2V0VmFsdWUgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgc3RvcmVba2V5XSA9IHZhbHVlO1xuICAgIH07XG5cbiAgICBjb25zdCBnZXRWYWx1ZSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKFxuICAgICAgICAoa2V5ID8gc3RvcmVba2V5XSA6IHN0b3JlKVxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgY29uc3QgcmVtb3ZlVmFsdWUgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICBsZXQgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIHN0b3JlKSB7XG4gICAgICAgICAgc3RvcmVba2V5XSA9IGluaXRpYWxba2V5XTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RvcmVba2V5XSA9IGluaXRpYWxba2V5XTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdWNjZXNzO1xuICAgIH07XG5cbiAgICBjb25zdCBzZXQgPSBmdW5jdGlvbiAoaXRlbSwgdmFsdWUsIG9wdGlvbnM9e30pIHtcbiAgICAgIGlmICh1dGlscy5pc09iamVjdChpdGVtKSkge1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gaXRlbSkge1xuICAgICAgICAgIHNldFZhbHVlKGtleSwgaXRlbVtrZXldLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0VmFsdWUoaXRlbSwgdmFsdWUsIG9wdGlvbnMpO1xuICAgICAgfVxuICAgICAgaWYgKCFvcHRpb25zLnNpbGVudCkge1xuICAgICAgICBfdGhpcy5nZXR0ZXIuZW1pdCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBnZXQgPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgaXRlbSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcmV0dXJuIGdldFZhbHVlKGl0ZW0pO1xuICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICAgIHJldHVybiBpdGVtLm1hcChrZXkgPT4gZ2V0VmFsdWUoa2V5KSk7XG4gICAgICB9IGVsc2UgaWYgKCFpdGVtKSB7XG4gICAgICAgIHJldHVybiBnZXRWYWx1ZSgpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IHt9O1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gaXRlbSkge1xuICAgICAgICAgIGxldCB2YWwgPSBpdGVtW2tleV07XG4gICAgICAgICAgbGV0IHR5cGUgPSB0eXBlb2YgdmFsO1xuICAgICAgICAgIGlmICh0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXN1bHRba2V5XSA9IGl0ZW1ba2V5XShnZXRWYWx1ZShrZXkpKTtcbiAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RpbmcnKSB7XG4gICAgICAgICAgICByZXN1bHRba2V5XSA9IGdldFZhbHVlKGtleSlbdmFsXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgcmVzZXQgPSBmdW5jdGlvbiAoaXRlbSwgb3B0aW9ucz17fSkge1xuICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgc2V0VmFsdWUoaXRlbSwgaW5pdGlhbFtpdGVtXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZW1vdmVWYWx1ZShpdGVtKTtcbiAgICAgIH1cbiAgICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgICAgX3RoaXMuZ2V0dGVyLmVtaXQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5zZXQgPSBzZXQ7XG4gICAgdGhpcy5nZXQgPSBnZXQ7XG4gICAgdGhpcy5yZXNldCA9IHJlc2V0O1xuXG4gICAgdGhpcy5zdGF0ZVByb3RvID0ge3NldCwgZ2V0LCByZXNldCwgYWN0aW9uc307XG4gICAgdGhpcy5nZXR0ZXIgPSBuZXcgR2V0dGVyKHRoaXMpO1xuICAgIHJldHVybiB0aGlzLmdldHRlcjtcbiAgfVxuXG4gIGFkZEFjdGlvbihpdGVtKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoaXRlbSkpIHtcbiAgICAgIHRoaXMuYWN0aW9ucyA9IHRoaXMuYWN0aW9ucy5jb25jYXQodGhpcy5hY3Rpb25zKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0Jykge1xuICAgICAgdGhpcy5hY3Rpb25zLnB1c2goaXRlbSk7XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlQWN0aW9uKGl0ZW0pIHtcbiAgICB2YXIgYWN0aW9uO1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGFjdGlvbiA9IHRoaXMuZmluZEJ5TmFtZSgnYWN0aW9ucycsICduYW1lJywgaXRlbSk7XG4gICAgICBpZiAoYWN0aW9uKSBhY3Rpb24ucmVtb3ZlU3RvcmUodGhpcyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGFjdGlvbiA9IGl0ZW07XG4gICAgICBsZXQgaW5kZXggPSB0aGlzLmFjdGlvbnMuaW5kZXhPZihhY3Rpb24pO1xuICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICBhY3Rpb24ucmVtb3ZlU3RvcmUodGhpcyk7XG4gICAgICAgIHRoaXMuYWN0aW9ucyA9IHRoaXMuYWN0aW9ucy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldEFjdGlvbkN5Y2xlKGFjdGlvbk5hbWUsIHByZWZpeD0nb24nKSB7XG4gICAgY29uc3QgY2FwaXRhbGl6ZWQgPSB1dGlscy5jYXBpdGFsaXplKGFjdGlvbk5hbWUpO1xuICAgIGNvbnN0IGZ1bGxBY3Rpb25OYW1lID0gYCR7cHJlZml4fSR7Y2FwaXRhbGl6ZWR9YDtcbiAgICBjb25zdCBoYW5kbGVyID0gdGhpcy5oYW5kbGVyc1tmdWxsQWN0aW9uTmFtZV0gfHwgdGhpcy5oYW5kbGVyc1thY3Rpb25OYW1lXTtcbiAgICBpZiAoIWhhbmRsZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gaGFuZGxlcnMgZm9yICR7YWN0aW9uTmFtZX0gYWN0aW9uIGRlZmluZWQgaW4gY3VycmVudCBzdG9yZWApO1xuICAgIH1cblxuICAgIGxldCBhY3Rpb25zO1xuICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGFjdGlvbnMgPSBoYW5kbGVyO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGFjdGlvbnMgPSB7b246IGhhbmRsZXJ9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7aGFuZGxlcn0gbXVzdCBiZSBhbiBvYmplY3Qgb3IgZnVuY3Rpb25gKTtcbiAgICB9XG4gICAgcmV0dXJuIGFjdGlvbnM7XG4gIH1cblxuICAvLyAxLiB3aWxsKGluaXRpYWwpID0+IHdpbGxSZXN1bHRcbiAgLy8gMi4gd2hpbGUodHJ1ZSlcbiAgLy8gMy4gb24od2lsbFJlc3VsdCB8fCBpbml0aWFsKSA9PiBvblJlc3VsdFxuICAvLyA0LiB3aGlsZShmYWxzZSlcbiAgLy8gNS4gZGlkKG9uUmVzdWx0KVxuICBydW5DeWNsZShhY3Rpb25OYW1lLCAuLi5hcmdzKSB7XG4gICAgLy8gbmV3IFByb21pc2UocmVzb2x2ZSA9PiByZXNvbHZlKHRydWUpKVxuICAgIGNvbnN0IGN5Y2xlID0gdGhpcy5nZXRBY3Rpb25DeWNsZShhY3Rpb25OYW1lKTtcbiAgICBsZXQgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIGxldCB3aWxsID0gY3ljbGUud2lsbCwgd2hpbGVfID0gY3ljbGUud2hpbGUsIG9uXyA9IGN5Y2xlLm9uO1xuICAgIGxldCBkaWQgPSBjeWNsZS5kaWQsIGRpZE5vdCA9IGN5Y2xlLmRpZE5vdDtcblxuICAgIC8vIExvY2FsIHN0YXRlIGZvciB0aGlzIGN5Y2xlLlxuICAgIGxldCBzdGF0ZSA9IE9iamVjdC5jcmVhdGUodGhpcy5zdGF0ZVByb3RvKTtcblxuICAgIC8vIFByZS1jaGVjayAmIHByZXBhcmF0aW9ucy5cbiAgICBpZiAod2lsbCkgcHJvbWlzZSA9IHByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICByZXR1cm4gd2lsbC5hcHBseShzdGF0ZSwgYXJncyk7XG4gICAgfSk7XG5cbiAgICAvLyBTdGFydCB3aGlsZSgpLlxuICAgIGlmICh3aGlsZV8pIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKHdpbGxSZXN1bHQpID0+IHtcbiAgICAgIHdoaWxlXy5jYWxsKHN0YXRlLCB0cnVlKTtcbiAgICAgIHJldHVybiB3aWxsUmVzdWx0O1xuICAgIH0pO1xuXG4gICAgLy8gQWN0dWFsIGV4ZWN1dGlvbi5cbiAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKCh3aWxsUmVzdWx0KSA9PiB7XG4gICAgICBpZiAod2lsbFJlc3VsdCA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBvbl8uYXBwbHkoc3RhdGUsIGFyZ3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9uXy5jYWxsKHN0YXRlLCB3aWxsUmVzdWx0KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFN0b3Agd2hpbGUoKS5cbiAgICBpZiAod2hpbGVfKSBwcm9taXNlID0gcHJvbWlzZS50aGVuKChvblJlc3VsdCkgPT4ge1xuICAgICAgd2hpbGVfLmNhbGwoc3RhdGUsIGZhbHNlKTtcbiAgICAgIHJldHVybiBvblJlc3VsdDtcbiAgICB9KTtcblxuICAgIC8vIEZvciBkaWQgYW5kIGRpZE5vdCBzdGF0ZSBpcyBmcmVlemVkLlxuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKG9uUmVzdWx0KSA9PiB7XG4gICAgICBPYmplY3QuZnJlZXplKHN0YXRlKTtcbiAgICAgIHJldHVybiBvblJlc3VsdDtcbiAgICB9KTtcblxuICAgIC8vIEhhbmRsZSB0aGUgcmVzdWx0LlxuICAgIGlmIChkaWQpIHByb21pc2UgPSBwcm9taXNlLnRoZW4ob25SZXN1bHQgPT4ge1xuICAgICAgcmV0dXJuIGRpZC5jYWxsKHN0YXRlLCBvblJlc3VsdCk7XG4gICAgfSk7XG5cbiAgICBwcm9taXNlLmNhdGNoKGVycm9yID0+IHtcbiAgICAgIGlmICh3aGlsZV8pIHdoaWxlXy5jYWxsKHN0YXRlLCBmYWxzZSk7XG4gICAgICBpZiAoZGlkTm90KSB7XG4gICAgICAgIGRpZE5vdC5jYWxsKHN0YXRlLCBlcnJvcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG59XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIGFsbG93ZWRHZXR0ZXJQcm9wczogWydnZXQnLCAnaW5pdGlhbCcsICdhY3Rpb25zJ11cbn07XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIGN4OiBmdW5jdGlvbiAoY2xhc3NOYW1lcykge1xuICAgIGlmICh0eXBlb2YgY2xhc3NOYW1lcyA9PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGNsYXNzTmFtZXMpLmZpbHRlcihmdW5jdGlvbihjbGFzc05hbWUpIHtcbiAgICAgICAgcmV0dXJuIGNsYXNzTmFtZXNbY2xhc3NOYW1lXTtcbiAgICAgIH0pLmpvaW4oJyAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5qb2luLmNhbGwoYXJndW1lbnRzLCAnICcpO1xuICAgIH1cbiAgfVxufTtcbiIsImltcG9ydCB1dGlscyBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdldENvbm5lY3RNaXhpbiAoc3RvcmUsIC4uLmtleSkge1xuICBsZXQgZ2V0U3RhdGVGcm9tQXJyYXkgPSBmdW5jdGlvbiAoc291cmNlLCBhcnJheSkge1xuICAgIGxldCBzdGF0ZSA9IHt9O1xuICAgIGFycmF5LmZvckVhY2goayA9PiB7XG4gICAgICBpZiAodHlwZW9mIGsgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIC8vIGNvbm5lY3QoJ2l0ZW1OYW1lJylcbiAgICAgICAgc3RhdGVba10gPSBzb3VyY2UuZ2V0KGspO1xuICAgICAgfSBlbHNlIGlmICh1dGlscy5pc09iamVjdChrKSkge1xuICAgICAgICBPYmplY3Qua2V5cyhrKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICAgIGlmICh0eXBlb2Yga1tuYW1lXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgLy8gY29ubmVjdCh7ZGF0YTogZnVuY3Rpb24gKGQpIHtyZXR1cm4gZC5uYW1lfX0pXG4gICAgICAgICAgICBzdGF0ZVtrXSA9IGtbbmFtZV0oc291cmNlLmdldChrKSk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Yga1tuYW1lXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIC8vIGNvbm5lY3Qoe25hbWVJblN0b3JlOiBuYW1lSW5Db21wb25lbnR9KVxuICAgICAgICAgICAgc3RhdGVba1tuYW1lXV0gPSBzb3VyY2UuZ2V0KG5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHN0YXRlO1xuICB9O1xuXG4gIGxldCBnZXRTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoa2V5Lmxlbmd0aCkge1xuICAgICAgICAvLyBnZXQgdmFsdWVzIGZyb20gYXJyYXlsXG4gICAgICByZXR1cm4gZ2V0U3RhdGVGcm9tQXJyYXkoc3RvcmUsIGtleSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGdldCBhbGwgdmFsdWVzXG4gICAgICByZXR1cm4gc3RvcmUuZ2V0KCk7XG4gICAgfVxuICB9O1xuXG4gIGxldCBjaGFuZ2VDYWxsYmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldFN0YXRlKGdldFN0YXRlKCkpO1xuICB9O1xuXG4gIHJldHVybiB7XG4gICAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gZ2V0U3RhdGUoKTtcbiAgICB9LFxuXG4gICAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHN0b3JlLm9uQ2hhbmdlKGNoYW5nZUNhbGxiYWNrLCB0aGlzKTtcbiAgICB9LFxuXG4gICAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHN0b3JlLm9mZkNoYW5nZShjaGFuZ2VDYWxsYmFjayk7XG4gICAgfVxuICB9O1xufVxuIiwiY29uc3QgdXRpbHMgPSB7fTtcblxudXRpbHMuZ2V0V2l0aG91dEZpZWxkcyA9IGZ1bmN0aW9uIChvdXRjYXN0LCB0YXJnZXQpIHtcbiAgaWYgKCF0YXJnZXQpIHRocm93IG5ldyBFcnJvcignVHlwZUVycm9yOiB0YXJnZXQgaXMgbm90IGFuIG9iamVjdC4nKTtcbiAgdmFyIHJlc3VsdCA9IHt9O1xuICBpZiAodHlwZW9mIG91dGNhc3QgPT09ICdzdHJpbmcnKSBvdXRjYXN0ID0gW291dGNhc3RdO1xuICB2YXIgdEtleXMgPSBPYmplY3Qua2V5cyh0YXJnZXQpO1xuICBvdXRjYXN0LmZvckVhY2goZnVuY3Rpb24oZmllbGROYW1lKSB7XG4gICAgdEtleXNcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHJldHVybiBrZXkgIT09IGZpZWxkTmFtZTtcbiAgICAgIH0pXG4gICAgICAuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB0YXJnZXRba2V5XTtcbiAgICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbnV0aWxzLm9iamVjdFRvQXJyYXkgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhvYmplY3QpLm1hcChrZXkgPT4gb2JqZWN0W2tleV0pO1xufTtcblxudXRpbHMuY2xhc3NXaXRoQXJncyA9IGZ1bmN0aW9uIChJdGVtLCBhcmdzKSB7XG4gIHJldHVybiBJdGVtLmJpbmQuYXBwbHkoSXRlbSxbSXRlbV0uY29uY2F0KGFyZ3MpKTtcbn07XG5cbi8vIDEuIHdpbGxcbi8vIDIuIHdoaWxlKHRydWUpXG4vLyAzLiBvblxuLy8gNC4gd2hpbGUoZmFsc2UpXG4vLyA1LiBkaWQgb3IgZGlkTm90XG51dGlscy5tYXBBY3Rpb25OYW1lcyA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICBjb25zdCBsaXN0ID0gW107XG4gIGNvbnN0IHByZWZpeGVzID0gWyd3aWxsJywgJ3doaWxlU3RhcnQnLCAnb24nLCAnd2hpbGVFbmQnLCAnZGlkJywgJ2RpZE5vdCddO1xuICBwcmVmaXhlcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgIGxldCBuYW1lID0gaXRlbTtcbiAgICBpZiAoaXRlbSA9PT0gJ3doaWxlU3RhcnQnIHx8IGl0ZW0gPT09ICd3aGlsZUVuZCcpIHtcbiAgICAgIG5hbWUgPSAnd2hpbGUnO1xuICAgIH1cbiAgICBpZiAob2JqZWN0W25hbWVdKSB7XG4gICAgICBsaXN0LnB1c2goW2l0ZW0sIG9iamVjdFtuYW1lXV0pO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBsaXN0O1xufTtcblxudXRpbHMuaXNPYmplY3QgPSBmdW5jdGlvbiAodGFyZykge1xuICByZXR1cm4gdGFyZyA/IHRhcmcudG9TdHJpbmcoKS5zbGljZSg4LDE0KSA9PT0gJ09iamVjdCcgOiBmYWxzZTtcbn07XG51dGlscy5jYXBpdGFsaXplID0gZnVuY3Rpb24gKHN0cikge1xuICBjb25zdCBmaXJzdCA9IHN0ci5jaGFyQXQoMCkudG9VcHBlckNhc2UoKTtcbiAgY29uc3QgcmVzdCA9IHN0ci5zbGljZSgxKTtcbiAgcmV0dXJuIGAke2ZpcnN0fSR7cmVzdH1gO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgdXRpbHM7XG4iXX0=
