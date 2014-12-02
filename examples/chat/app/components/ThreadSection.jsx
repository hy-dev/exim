var ThreadListItem = require('./ThreadListItem');
var threadsActions = require('actions/threads');
var threadsStore   = require('stores/threads');

var ThreadSection = React.createClass({
  mixins: [Exim.connect(threadsStore, 'threads', 'unread')],

  componentWillMount: function () {
    threadsActions.recieveThreads();
  },

  render: function() {
    var threads = this.state.threads
    var compareThreads = function (a, b) {
      if (threads[b].lastMessage && threads[a].lastMessage) {
        return threads[b].lastMessage.date - threads[a].lastMessage.date;
      }
    };

    var threadListItems = Object.keys(threads).sort(compareThreads).map(function(threadID) {
      var thread = threads[threadID]
      return (
        <ThreadListItem key={threadID} thread={thread}/>
      );
    }, this);

    return (
      <div className="thread-section">
        <div className="thread-count">
          <span>Unread threads: {this.state.unread}</span>
        </div>
        <ul className="thread-list">
          {threadListItems}
        </ul>
      </div>
    );
  }

});

module.exports = ThreadSection;
