var utils = {};

utils.ready = function (fn) {
  document.onreadystatechange = function () {
   if (document.readyState == "complete") {
      fn()
   }
  }
}

utils.transform = function (constants, mappings) {
  return Object.keys(mappings).map(function (k) {
    return [constants[k], mappings[k]];
  })
};

utils.getAndParse = function (name) {
  var items = localStorage.getItem(name)
  var parsed = JSON.parse(items);
  return parsed
}

utils.dateComparator = function (a, b) {
  return a.date - b.date;
}

utils.dateSetter = function (message) {
  message.date = new Date(message.timestamp);
  return message
};

utils.getThreads = function (messages) {
  var threads = {};
  messages.forEach(function (message) {
    threads[message.threadID] = {
      id: message.threadID,
      name: message.threadName,
      lastMessage: message
    };
  })
  return threads;
}

module.exports = utils;
