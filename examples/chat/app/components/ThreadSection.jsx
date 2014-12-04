var ThreadListItem = require('./ThreadListItem');
var actions = require('actions/threads');
var Store = require('stores/threads');

var ThreadSection = React.createClass({
  mixins: [Exim.connect(Store, 'threads', 'unread')],

  componentWillMount: function () {
    actions.recieveThreads();
  },

  render: function() {
    var threads = this.state.threads
    var items = Object.keys(threads)
      .sort(function (a, b) {
        if (threads[b].lastMessage && threads[a].lastMessage) {
          return threads[b].lastMessage.date - threads[a].lastMessage.date;
        }
      })
      .map(function(threadID) {
        var thread = threads[threadID]
        return (
          <ThreadListItem key={threadID} thread={thread}/>
        );
      });

    return (
      <div className="thread-section">
        <div className="thread-count">
          <span>Unread threads: {this.state.unread}</span>
        </div>
        <ul className="thread-list">
          {items}
        </ul>
      </div>
    );
  }

});

module.exports = ThreadSection;
