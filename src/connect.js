// var Reflux = require('../src'),
//     _ = require('./utils');


Reflux.connect = function (listenable, key) {
  var key = arguments.length > 2 ? [].slice.call(arguments, 1) : key;

  var getStateFromArray = function (source, arr) {
    var state = {};
    arr.forEach(function (k) {
      state[k] = source[k];
    })
    return state;
  };

  return {
    getInitialState: function () {
      var initialData;
      if (Array.isArray(key)) {
        initialData = listenable.get()
        var state = getStateFromArray(initialData, key)
        return state
      } else if (!key) {
        return (initialData = listenable.get()) ? initialData : {}
      } else if (typeof key === 'string') {
        initialData = listenable.get();
        var state = {};
        state[key] = initialData[key];
        return state;
      }
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
            state[key] = utils.isObjectOrFunction(v) ? v[key] : v;
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
