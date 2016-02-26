// Save the user on the server;
// While saving => show the spinner

var UserStore = Exim.createStore({
  initial: {isLoading: false},
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
  mixins: [UserStore.connect('isLoading')],
  save() {
    actions.saveUser({name: 'Paul'}),
  },
  render() {
    if (this.state.isLoading) {
      return <span>Saving...</span>
    } else {
      return <button onClick={this.save}>Save user</button>
    }
  }
});
