export default function getConnectMixin (store) {
  let changeCallback = function (state) {
    this.setState(state.toJS());
  };

  let listener, changeCallbackBound;

  return {
    getInitialState: function () {
      const frozen = store.store.get(arguments);
      const state = frozen.toJS();
      changeCallbackBound = changeCallback.bind(this);
      listener = frozen.getListener();
      return state;
    },

    componentDidMount: function () {
      listener.on('update', changeCallbackBound);
    },

    componentWillUnmount: function () {
      if (listener)
        listener.off('update', changeCallbackBound);
    }
  };
}
