var Link = Exim.Router.Link;
var State = Exim.Router.State;

var ListItem = React.createClass({
  mixins: [State],

  render: function () {
    var isActive = this.isActive(this.props.to, this.props.params, this.props.query);
    var className = isActive ? ' active ' : '';
    if (cls = this.props.className) {
      className += cls;
      this.props.className = '';
    }
    var link = Link(this.props, this.props.children);
    return (
      <li className={className}>{link}</li>
    )
  }
});

var ThreadListItem = React.createClass({
  mixins: [ State ],

  propTypes: {
    thread: React.PropTypes.object,
    currentThreadID: React.PropTypes.string
  },

  render: function () {
    var thread = this.props.thread
    var lastMessage = thread.lastMessage;
    var className = Exim.helpers.cx({
      'thread-list-item': true,
      'unread': thread.unread
    })

    return (
      <ListItem className={className} to="message" params={{id: thread.id}}>
        <h5 className="thread-name">{thread.name}</h5>
        <div className="thread-time">
          {lastMessage.date.toLocaleTimeString()}
        </div>
        <div className="thread-last-message">
          {lastMessage.text}
        </div>
      </ListItem>
    )
  }
})

module.exports = ThreadListItem
