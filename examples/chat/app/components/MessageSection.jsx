var MessageListItem = require("./MessageListItem");
var MessageComposer = require("./MessageComposer");
var MessageActions  = require("actions/messages");
var MessageStore    = require("stores/messages");
var ThreadActions   = require("actions/threads");
var ThreadStore     = require("stores/threads");

var MessageSection = React.createClass({
  mixins: [
    Exim.Router.State,
    Exim.connect(MessageStore, 'messages'),
    Exim.connect(ThreadStore, 'currentID')
  ],

  statics: {
    willTransitionTo: function (transition, params) {
      if (params && params.id) {
        ThreadActions.updateCurrent(params.id);
        MessageActions.recieveMessages();
      }
    }
  },

  componentDidUpdate: function () {
    this.scrollToBottom();
  },

  updateUnread: function () {
    var id = this.getParams().id;
    var thread = ThreadStore.get('threads')[id];
    if (!thread.lastMessage.isRead) {
      ThreadActions.updateUnread(id);
    }
  },

  scrollToBottom: function () {
    var list = this.refs.messageList.getDOMNode();
    list.scrollTop = list.scrollHeight;
  },

  render: function () {
    var messageListItems = this.state.messages.map(function (message) {
      return <MessageListItem key={message.id} message={message}/>
    });

    return (
      <div className="message-section" onMouseMove={this.updateUnread}>
        <h3 className="message-thread-heading">{this.state.current}</h3>
        <ul className="message-list" ref="messageList">
          {messageListItems}
        </ul>
        <MessageComposer />
      </div>
    );
  }
})

module.exports = MessageSection
