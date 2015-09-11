export default function getConnectMixin (store) {
  let changeCallback = function (state) {
    this.setState(state.toJS());
  };

  let listener;

  return {
    getInitialState: function () {
      const frozen = store.store.get(arguments);
      const state = frozen.toJS();

      if (!this.boundEximChangeCallbacks)
        this.boundEximChangeCallbacks = {};

      this.boundEximChangeCallbacks[store] = changeCallback.bind(this);

      listener = frozen.getListener();
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
