export default function getConnectMixin (store) {
  let changeCallback = function (state) {
    this.setState(state);
  };

  let listener;

  return {
    getInitialState: function () {
      const state = store.get(arguments);
      listener = state.getListener();
      changeCallback = changeCallback.bind(this);
      return state;
    },

    componentDidMount: function () {
      listener.on('update', changeCallback);
    },

    componentWillUnmount: function () {
      listener.off('update', changeCallback);
    }
  };
}
