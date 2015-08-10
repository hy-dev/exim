export default function getConnectMixin (store) {
  let changeCallback = function (state) {
    this.setState(state.toJS());
  };

  let listener;

  return {
    getInitialState: function () {
      const frozen = store.store.get(arguments);
      const state = frozen.toJS();
      listener = frozen.getListener();
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
