var actions = require('actions/threads');
var utils = require('lib/utils');

var store = Exim.createStore({
  actions: actions,

  getInitial: function() {
    return {
      threads: {},
      currentID: null,
      unread: 0
    }
  },

  recieveThreads: function() {
    var messages = utils.getAndParse('messages')
      .map(utils.dateSetter)
      .sort(utils.dateComparator);
    var threads = utils.getThreads(messages);
    this.update('threads', threads);
  },

  didRecieveThreads: function() {
    actions.updateUnread();
  },

  updateCurrent: function(id) {
    this.update('currentID', id);
  },

  updateLast: function(message) {
    var threads = this.get('threads');
    var thread = threads[message.threadID];
    thread.lastMessage = message;
    this.update('threads', threads);
  },

  updateUnread: function(threadId, value) {
    var lastMessage;
    var threads = this.get('threads');

    if (threadId) {
      var thread  = threads[threadId];
      thread.lastMessage.isRead = value || true;
      this.update('threads', threads);
    }

    var unread = 0;
    for (key in threads) {
      lastMessage = threads[key].lastMessage
      if (lastMessage && !lastMessage.isRead) {
        unread++;
      }
    }
    this.update('unread', unread);
  }

})

module.exports = store
