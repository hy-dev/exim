import utils from '../utils';

const getConnectMixin = function(store, ...key) {
  const getStateFromArray = function(source, array) {
    const state = {};
    array.forEach(k => {
      if (typeof k === 'string') {
        state[k] = source.get(k);
      } else if (utils.isObject(k)) {
        Object.keys(k).forEach(name => {
          if (typeof k[name] === 'function') {
            state[k] = k[name](source.get(k));
          } else if (typeof k[name] === 'string') {
            state[k[name]] = source.get(name);
          }
        });
      }
    });
    return state;
  };

  const getState = function() {
    return key.length ?
      getStateFromArray(store, key) :
      store.get();
  };

  const changeCallback = function() {
    const prev = this.state;
    const curr = getState();
    const diff = Object.keys(curr).some(key => Array.isArray(curr[key]) || (prev[key] !== curr[key]));
    if (diff) this.setState(curr);
  };

  return {
    getInitialState: function() {
      return getState();
    },

    componentWillMount: function() {
      store.onChange(changeCallback, this);
    },

    componentWillUnmount: function() {
      store.offChange(changeCallback);
    }
  };
};

export default getConnectMixin;
