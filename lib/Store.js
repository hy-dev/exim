var getActionKeyForName = function (actionName) {
  var name = actionName;
  if (name.value) {
    name = name.value;
  }
  name = convertName(name);
  name = name.charAt(0).toUpperCase() + name.substr(1, name.length);
  return 'handle'+name;
};

var toArray = function (val) {
  if (!Array.isArray(val)) {
    val = [val];
  }
  return val;
};

var Store = function () {};

Store.prototype = utils.extend(Store.prototype, {
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
  }
});

Store.extend = function (ChildFn, ChildProto) {
  utils.inherits(ChildFn, Store);
  if (ChildProto) {
    ChildFn.prototype = utils.extend(ChildFn.prototype, ChildProto);
  }
  //TODO: iterate over specific FN names
  return ChildFn;
};
