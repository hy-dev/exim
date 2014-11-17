// var Reflux = require('../src'),
//     _ = require('./utils');


Reflux.connect = function (listenable, key) {
  return {
    getInitialState: function () {
      var initialData;
      return (initialData = listenable.get()) ? initialData : {}
    },
    componentDidMount: function() {
      for(var m in Reflux.ListenerMethods) {
        if (this[m] !== Reflux.ListenerMethods[m]){
          if (this[m]) {
            throw "Can't have other property '"+m+"' when using Reflux.listenTo!";
          }
          this[m] = Reflux.ListenerMethods[m];
        }
      }
      var me = this;

      if (key === undefined) {
        var cb = this.setState
      } else {
        var cb = function(v) {
          var state = {};
          if (Array.isArray(key)) {
            key.forEach(function (k) {
              state[k] = v[k]
            });
          } else {
            state[key] = utils.isObject(v) ? v[key] : v;
          }
          me.setState(state);
        }
      }
      this.listenTo(listenable,cb,cb);
    },
    componentWillUnmount: Reflux.ListenerMixin.componentWillUnmount
  };
};

// Reflux.watch = function (listenable, keys) {

// };
