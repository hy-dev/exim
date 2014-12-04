var MessageListItem = React.createClass({
  propTypes: {
    message: React.PropTypes.object
  },

  render: function() {
    var msg = this.props.message;
    return (
      <li className="message-list-item">
        <h5 className="message-author-name">{msg.authorName}</h5>
        <div className="message-time">
          {msg.date.toLocaleTimeString()}
        </div>
        <div className="message-text">{msg.text}</div>
      </li>
    );
  }
});

module.exports = MessageListItem;
