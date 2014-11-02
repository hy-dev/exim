//Copyright 2014 Justin Reidy

var stores  = [];
var actions = [];
window.actions = actions;

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


var Exim = function () {
  this._dispatcher = new Dispatcher();
};

Exim.createStore = function (proto) {
  var Store = EximStore.extend(function () {
    EximStore.call(this);
  }, proto);
  var store = new Store();
  stores.push(store);
  return store;
};

Exim.createActions = function (proto) {
  var Action = EximAction.extend(proto);
  var action = new Action();
  actions.push(action);
  return action;
};

Exim.createConstants = function (values) {
  return ConstantsFactory(values);
};

Exim.start = function (initialData) {
  var flux = new Exim();
  stores.forEach(function (store) {
    store.mount(flux);
    assignDataToStore(initialData, store);
  });
  actions.forEach(function (action) {
    action.mount(flux);
  });
  return flux;
};

Exim.bootstrap = function (key, context) {
  var initialData;
  if (!context && window) {
    context = window;
  }

  if (context && context[key]) {
    initialData = context[key];
  }

  Exim.start(initialData);
};

Exim.renderStateToString = function (serializer) {
  var state = {};
  serializer = serializer || safeStringify;
  stores.forEach(function (store) {
    if (store.name) {
      state[store.name] = store.toJS(store.state);
    }
  });

  return serializer(state);
};

Exim.reset = function () {
  stores = [];
  actions = [];
};

Exim.utils = utils;

Exim.prototype = utils.extend(Exim.prototype, {
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


Exim.cx = function (classNames) {
  if (typeof classNames == 'object') {
    return Object.keys(classNames).filter(function(className) {
      return classNames[className];
    }).join(' ');
  } else {
    return Array.prototype.join.call(arguments, ' ');
  }
};

var domHelpers = {};

var tag = function (name) {
  var args, attributes, name;
  args = [].slice.call(arguments, 1);
  var first = args[0] && args[0].constructor;
  if (first === Object) {
    attributes = args.shift();
  } else {
    attributes = {};
  }
  return React.DOM[name].apply(React.DOM, [attributes].concat(args))
};

var bindTag = function(tagName) {
  return domHelpers[tagName] = tag.bind(this, tagName);
};

for (var tagName in React.DOM) {
  bindTag(tagName);
}

domHelpers['space'] = function() {
  return React.DOM.span({
    dangerouslySetInnerHTML: {
      __html: '&nbsp;'
    }
  });
};

Exim.DOM = domHelpers;

Exim.addTag = function (name, tag) {
  this.DOM[name] = tag;
}

Exim.router = ReactRouter;

Exim._exims = {};
Exim.mixins = {};

var getSerivceActions = function (constants, actions) {
  var serviceActions = {};
  for (var key in actions) {
    serviceActions[key] = [constants[key], actions[key]];
  }
  return serviceActions;
};

var getCompletedActions = function (actions) {
  var afterActions = {};
  for (var key in actions) {
    afterActions[key + '_COMPLETED'] = actions[key];
  }
  return afterActions;
};

var getFailedActions = function (actions) {
  var failedActions = {};
  for (var key in actions) {
    failedActions[key + '_FAILED'] = actions[key];
  }
  return failedActions;
};


var EximConstructor = function (args) {
  var actions = args.actions;
  var name = args.name
  var initial = args.initial

  var before = args.before;
  var after = getCompletedActions(args.after);
  var failed = getFailedActions(args.failed);
  var storeActions = utils.extend(after, before, failed);

  this.constants = Exim.createConstants({serviceMessages: Object.keys(actions)});
  this.actions = Exim.createActions({serviceActions: actions});
  this.store = Exim.createStore({name:name, getInitialState: initial, actions: Exim.utils.transform(this.constants, storeActions )});
  Exim.bootstrap('__exim__');
}

Exim.create = function (args) {
  return new EximConstructor(args);
};

return Exim;

