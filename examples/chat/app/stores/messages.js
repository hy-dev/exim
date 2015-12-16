var ThreadStore = require('./threads');
var utils = require('lib/utils');

var store = Exim.createStore({
  actions: [
    'recieveMessages',
    'createMessage'
  ],

  initial: {
    messages: []
  },

  recieveMessages: function () {
    var threadID = ThreadStore.get('currentID');
    var messages = utils.getAndParse('messages');
    var filtered = messages
      .filter(function (message) {
        return message.threadID === threadID;
      })
      .map(utils.dateSetter)
      .sort(utils.dateComparator);
    this.set({messages: filtered});
  },

  createMessage: {
    on: function(text) {
      var timestamp = Date.now();
      var message = {
        id: 'm_' + timestamp,
        threadID: ThreadStore.get('currentID'),
        text: text,
        isRead: true,
        authorName: 'Bill',
        date: new Date(timestamp),
        timestamp: timestamp
      }
      var localStorageItems = JSON.parse(localStorage.getItem('messages'));
      localStorageItems.push(message);
      localStorage.setItem('messages', JSON.stringify(localStorageItems));

      var storeItems = this.get('messages');
      storeItems.push(message);
      this.set('messages', storeItems);

      return message;
    },
    did: function(message) {
      ThreadStore.actions.updateLast(message);
    }
  }
})

module.exports = store
