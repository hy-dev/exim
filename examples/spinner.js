// Save the user on the server;
// While saving => show the spinner

var actions = Exim.createActions('saveUser');

var UserStore = Exim.createStore({
  actions: actions,
  saveUser: {
    on: (data) => {
      return request.post('/v1/user', data);
    }
    while: (isLoading) => {
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
