var Listener = function (args) {
  var getState;
  var stores = [];

  if (args.store) {
    stores.push(store);
  } else if (args.stores) {
    stores = args.stores;
  } else {
    throw new Error('Store is missing!');
  }

  if (typeof args.getState === 'function') {
    getState = args.getState
  } else if (typeof args.getState === 'object') {
    getState = function () {return args.getState};
  } else {
    throw new Error('getState is missing!');
  }

  this.stores = stores;
  this.getState = getState;
};

Listener.prototype.getInitialState = function () {
  return this.getState();
};

Listener.prototype.componentDidMount = function () {
  var self = this;
  this.stores.map(function (store) {
    store.addWatch(self._onChange);
  });
};

Listener.prototype.componentWillUnmount = function () {
  var self = this;
  this.stores.map(function (store) {
    store.removeWatch(self._onChange);
  })
};

Listener.prototype._onChange = function () {
  this.setState(this.getState());
};

