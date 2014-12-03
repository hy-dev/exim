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

  recieveMessages: function () {
    var threadID = threadsStore.get('currentID');
    var messages = utils.getAndParse('messages');
    return messages
      .filter(function (message) {
        return message.threadID === threadID;
      })
      .map(utils.dateSetter)
      .sort(utils.dateComparator);
  },

  didRecieveMessages: function (data) {
    this.update({messages: data});
  },

  createMessage: {
    on: function(text) {
      var timestamp = Date.now();
      var message = {
        id: 'm_' + timestamp,
        threadID: threadsStore.get('currentID'),
        text: text,
        isRead: true,
        authorName: 'Bill',
        date: new Date(timestamp),
        timestamp: timestamp
      }
      var localStorageItems = JSON.parse(localStorage.getItem('messages'));
      localStorageItems.push(message);
      localStorage.setItem('messages', JSON.stringify(localStorageItems));
      return message;
    },
    did: function(message) {
      var storeItems = this.get('messages');
      storeItems.push(message);
      this.update('messages', storeItems);
      threadActions.updateLast(message);
    },
  }
})

module.exports = store
