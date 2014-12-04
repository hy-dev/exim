var MessageListItem = require("./MessageListItem");
var MessageComposer = require("./MessageComposer");
var messagesActions = require("actions/messages");
var messagesStore   = require("stores/messages");
var threadActions   = require("actions/threads");
var threadStore     = require("stores/threads");

var MessageSection = React.createClass({
  mixins: [
    Exim.Router.State,
    Exim.connect(messagesStore, 'messages'),
    Exim.connect(threadStore, 'currentID')
  ],

  statics: {
    willTransitionTo: function (transition, params) {
      if (params && params.id) {
        threadActions.updateCurrent(params.id);
        messagesActions.recieveMessages();
      }
    }
  },

  componentDidUpdate: function () {
    this.scrollToBottom();
  },

  updateUnread: function () {
    var id = this.getParams().id;
    var thread = threadStore.get('threads')[id];
    if (!thread.lastMessage.isRead) {
      threadActions.updateUnread(id);
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
