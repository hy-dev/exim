var ENTER_KEY_CODE = 13;
var MessageStore    = require("stores/messages");

var MessageComposer = React.createClass({
  getInitialState: function() {
    return {text: ''};
  },

  onChange: function(event, value) {
    this.setState({text: event.target.value});
  },

  onKeyDown: function(event) {
    if (event.keyCode === ENTER_KEY_CODE) {
      event.preventDefault();
      var text = this.state.text.trim();
      if (text) {
        MessageStore.actions.createMessage(text);
      }
      this.setState({text: ''});
    }
  },

  render: function() {
    return (
      <textarea
        className="message-composer"
        name="message"
        value={this.state.text}
        onChange={this.onChange}
        onKeyDown={this.onKeyDown}
      />
    );
  }
});

module.exports = MessageComposer;
