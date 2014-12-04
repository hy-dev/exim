// Save the user on the server;
// While saving => show the spinner

var action = Exim.createAction('saveUser');

var UserStore = Exim.createStore({
  actions: action,
  getInitial: () => {
    return {isLoading: false}
  },
  saveUser: {
    on: (data) => {
      return request.post('/v1/user', data);
    }
    while: (isLoading) => {
      //Runs before and after action.
      this.update({isLoading: isLoading});
    }
  }
});

var UserComponent = React.createComponent({
  mixins: [Exim.connect(UserStore, 'isLoading')],
  save: => actions.saveUser({name: 'Paul'}),
  render: => {
    if (this.state.isLoading) {
      return <span>Saving...</span>
    } else {
      return <button onClick={this.save}>Save user</button>
    }
  }
});
