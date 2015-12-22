import utils from '../utils'

export default function getConnectMixin (store, ...key) {
  let getStateFromArray = function (source, array) {
    let state = {}
    array.forEach(k => {
      if (typeof k === 'string') {
        // connect('itemName')
        state[k] = source.get(k)
      } else if (utils.isObject(k)) {
        Object.keys(k).forEach(name => {
          if (typeof k[name] === 'function') {
            // connect({data: function (d) {return d.name}})
            state[k] = k[name](source.get(k));
          } else if (typeof k[name] === 'string') {
            // connect({nameInStore: nameInComponent})
            state[k[name]] = source.get(name)
          }
        })
      }
    });
    return state;
  }

  let getState = function () {
    if (key.length) {
        // get values from array
      return getStateFromArray(store, key);
    } else {
      // get all values
      return store.get()
    }
  }

  let changeCallback = function () {
    var prev = this.state;
    var curr = getState();
    var isDifferent = false;

    for (var key in curr) {
      var prevValue = prev[key];
      var currValue = curr[key];
      if (prevValue !== currValue) {
        // console.log('Exim#changeCallback diff', key, prevValue, currValue);
        isDifferent = true;
        break;
      }
    }

    if (!isDifferent) return;
    this.setState(curr);
  }

  return {
    getInitialState: function () {
      return getState()
    },

    componentDidMount: function () {
      store.onChange(changeCallback, this);
    },

    componentWillUnmount: function () {
      store.offChange(changeCallback);
    }
  }
}
