var utils = require('lib/utils');

var store = Exim.createStore({
  actions: [
    'recieveThreads',
    'updateCurrent',
    'updateLast',
    'updateUnread'
  ],

  initial: {
    threads: {},
    currentID: null,
    unread: 0
  },

  recieveThreads: function() {
    var messages = utils.getAndParse('messages')
      .map(utils.dateSetter)
      .sort(utils.dateComparator);
    var threads = utils.getThreads(messages);
    console.log(threads);
    this.set('threads', threads);
  },

  didRecieveThreads: function() {
    this.actions.updateUnread();
  },

  updateCurrent: function(id) {
    this.set('currentID', id);
  },

  updateLast: function(message) {
    var threads = this.get('threads');
    var thread = threads[message.threadID];
    thread.lastMessage = message;
    this.set('threads', threads);
  },

  updateUnread: function(threadId, value) {
    var lastMessage;
    var threads = this.get('threads');

    if (threadId) {
      var thread  = threads[threadId];
      thread.lastMessage.isRead = value || true;
      this.set('threads', threads);
    }

    var unread = 0;
    for (key in threads) {
      lastMessage = threads[key].lastMessage
      if (lastMessage && !lastMessage.isRead) {
        unread++;
      }
    }
    this.set('unread', unread);
  }

})

module.exports = store
