export default function getConnectMixin (store, keys) {
  let changeCallback = function (state) {
    this.setState(state.toJS());
  };

  let listener;

  return {
    getInitialState: function () {
      const state = {};

      keys.forEach(key => {
        state[key] = store.get(key);
      });

      if (!this.boundEximChangeCallbacks)
        this.boundEximChangeCallbacks = {};

      this.boundEximChangeCallbacks[store] = changeCallback.bind(this);

      listener = store.store.get().getListener();
      return state;
    },

    componentDidMount: function () {
      listener.on('update', this.boundEximChangeCallbacks[store]);
    },

    componentWillUnmount: function () {
      if (listener)
        listener.off('update', this.boundEximChangeCallbacks[store]);
    }
  };
}
