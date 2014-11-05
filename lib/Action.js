var constructArgs = function (serviceName, args) {
  var arrArgs = Array.prototype.slice.call(args);
  arrArgs.unshift(serviceName);
  return arrArgs;
};

var EximAction = function (scope) {
 this._configureServiceActions(scope);
};

EximAction.prototype = utils.extend(EximAction.prototype, {
  actions: {},
  serviceActions: {},
  mount: function (flux) {
    this.flux = flux;
    this.dispatchAction = flux.dispatchAction.bind(flux);
  },
  _configureServiceActions: function (scope) {
    var self = this;
    Object.keys(this.serviceActions).forEach(function (key) {
      var serviceName = key;
      var actionName = key;
      var method = self.serviceActions[key];
      if (self[actionName]) {
        throw new Error('Cannot assign duplicate function name "' + actionName + '"');
      }

      self[actionName] = function () {
        var args = constructArgs(serviceName, arguments);
        self.dispatchAction.apply(self.flux, args);
        var actionResult = method.apply(self, Array.prototype.slice.call(arguments));
        if (actionResult.constructor !== Promise) {
          actionResult = new Promise(function(r){r()});
        }
        return actionResult
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
