var actions = require('actions/messages');
var threadActions = require('actions/threads')
var threadsStore = require('./threads');

var store = Exim.createStore({
  actions: actions,

  getInitial: function () {
    return {
      messages: []
    }
  },

  willRecieveMessages: function () {
    var threadID = threadsStore.get('currentID');

    var threadFilterer = function (message) {
      return message.threadID === threadID;
    };

    var messages = utils.getAndParse('messages');
    return messages.filter(threadFilterer).map(utils.dateSetter).sort(utils.dateComparator);
  },

  recieveMessages: function (data) {
    this.update({messages: data});
  },

  createMessage: {
    will: function (text) {
      var timestamp = Date.now();
      return {
        id: 'm_' + timestamp,
        threadID: threadsStore.get('currentID'),
        text: text,
        isRead: true,
        authorName: 'Bill',
        date: new Date(timestamp),
        timestamp: timestamp
      }
    },
    on: function (message) {
      var localStorageItems = JSON.parse(localStorage.getItem('messages'));
      localStorageItems.push(message);
      localStorage.setItem('messages', JSON.stringify(localStorageItems));
      return message
    },
    did: function (message) {
      var storeItems = this.get('messages');
      storeItems.push(message);
      this.update('messages', storeItems);
      threadActions.updateLast(message);
    },
  }
})

module.exports = store
