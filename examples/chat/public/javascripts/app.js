(function(/*! Brunch !*/) {
  'use strict';

  var globals = typeof window !== 'undefined' ? window : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};

  var has = function(object, name) {
    return ({}).hasOwnProperty.call(object, name);
  };

  var expand = function(root, name) {
    var results = [], parts, part;
    if (/^\.\.?(\/|$)/.test(name)) {
      parts = [root, name].join('/').split('/');
    } else {
      parts = name.split('/');
    }
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function(name) {
      var dir = dirname(path);
      var absolute = expand(dir, name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var require = function(name, loaderPath) {
    var path = expand(name, '.');
    if (loaderPath == null) loaderPath = '/';

    if (has(cache, path)) return cache[path].exports;
    if (has(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (has(cache, dirIndex)) return cache[dirIndex].exports;
    if (has(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '" from '+ '"' + loaderPath + '"');
  };

  var define = function(bundle, fn) {
    if (typeof bundle === 'object') {
      for (var key in bundle) {
        if (has(bundle, key)) {
          modules[key] = bundle[key];
        }
      }
    } else {
      modules[bundle] = fn;
    }
  };

  var list = function() {
    var result = [];
    for (var item in modules) {
      if (has(modules, item)) {
        result.push(item);
      }
    }
    return result;
  };

  globals.require = require;
  globals.require.define = define;
  globals.require.register = define;
  globals.require.list = list;
  globals.require.brunch = true;
})();
require.register("actions/app", function(exports, require, module) {
var actions = Exim.createActions([
  'start'
]);

module.exports = actions;

});

require.register("actions/messages", function(exports, require, module) {
var actions = Exim.createActions([
  'recieveMessages',
  'createMessage'
]);

module.exports = actions;

});

require.register("actions/threads", function(exports, require, module) {
var actions = Exim.createActions([
  'recieveThreads',
  'updateCurrent',
  'updateLast',
  'updateUnread'
]);

module.exports = actions;

});

require.register("components/App", function(exports, require, module) {
var ThreadSection  = require("./ThreadSection");
var MessageSection = require("./MessageSection");
var RouteHandler   = ReactRouter.RouteHandler;

App = React.createClass({displayName: 'App',
  render: function () {
    return (
      React.createElement("div", {className: "chatapp"}, 
        React.createElement(ThreadSection, null), 
        React.createElement(RouteHandler, null)
      )
    )
  }
})

module.exports = App

});

;require.register("components/MessageComposer", function(exports, require, module) {
var ENTER_KEY_CODE = 13;
var messagesActions = require("actions/messages");

var MessageComposer = React.createClass({displayName: 'MessageComposer',
  getInitialState: function() {
    return {text: ''};
  },

  onChange: function(event, value) {
    this.setState({text: event.target.value});
  },

  onKeyDown: function(event) {
    if (event.keyCode === ENTER_KEY_CODE) {
      event.preventDefault();
      var text = this.state.text.trim();
      if (text) {
        messagesActions.createMessage(text);
      }
      this.setState({text: ''});
    }
  },

  render: function() {
    return (
      React.createElement("textarea", {
        className: "message-composer", 
        name: "message", 
        value: this.state.text, 
        onChange: this.onChange, 
        onKeyDown: this.onKeyDown}
      )
    );
  }
});

module.exports = MessageComposer;

});

require.register("components/MessageListItem", function(exports, require, module) {
var MessageListItem = React.createClass({displayName: 'MessageListItem',
  propTypes: {
    message: React.PropTypes.object
  },

  render: function() {
    var message = this.props.message;
    return (
      React.createElement("li", {className: "message-list-item"}, 
        React.createElement("h5", {className: "message-author-name"}, message.authorName), 
        React.createElement("div", {className: "message-time"}, 
          message.date.toLocaleTimeString()
        ), 
        React.createElement("div", {className: "message-text"}, message.text)
      )
    );
  }
});

module.exports = MessageListItem;

});

require.register("components/MessageSection", function(exports, require, module) {
var MessageListItem = require("./MessageListItem");
var MessageComposer = require("./MessageComposer");
var messagesActions = require("actions/messages");
var messagesStore   = require("stores/messages");
var threadActions   = require("actions/threads");
var threadStore     = require("stores/threads");

var MessageSection = React.createClass({displayName: 'MessageSection',
  mixins: [
    ReactRouter.State,
    Exim.connect(messagesStore, 'messages'),
    Exim.connect(threadStore, 'currentID')
  ],

  statics: {
    willTransitionTo: function (transition, params) {
      if (params && params.id) {
        threadActions.updateCurrent(params.id);
        messagesActions.recieveMessages();
      }
    }
  },

  componentDidUpdate: function () {
    this.scrollToBottom();
  },

  updateUnread: function () {
    var id = this.getParams().id;
    var thread = threadStore.get('threads')[id];
    if (!thread.lastMessage.isRead) {
      threadActions.updateUnread(id);
    }
  },

  scrollToBottom: function () {
    var list = this.refs.messageList.getDOMNode();
    list.scrollTop = list.scrollHeight;
  },

  render: function () {
    var messageListItems = this.state.messages.map(function (message) {
      return React.createElement(MessageListItem, {key: message.id, message: message})
    });

    return (
      React.createElement("div", {className: "message-section", onMouseMove: this.updateUnread}, 
        React.createElement("h3", {className: "message-thread-heading"}, this.state.current), 
        React.createElement("ul", {className: "message-list", ref: "messageList"}, 
          messageListItems
        ), 
        React.createElement(MessageComposer, null)
      )
    );
  }
})

module.exports = MessageSection

});

;require.register("components/ThreadListItem", function(exports, require, module) {
var Link = ReactRouter.Link;
var State = ReactRouter.State;

var ListItem = React.createClass({displayName: 'ListItem',
  mixins: [ State ],

  render: function () {
    var isActive = this.isActive(this.props.to, this.props.params, this.props.query);
    var className = isActive ? ' active ' : '';
    if (cls = this.props.className) {
      className += cls;
      this.props.className = '';
    }
    var link = Link(this.props);
    return (
      React.createElement("li", {className: className}, link)
    )
  }
});

var ThreadListItem = React.createClass({displayName: 'ThreadListItem',
  mixins: [ State ],

  propTypes: {
    thread: React.PropTypes.object,
    currentThreadID: React.PropTypes.string
  },

  render: function () {
    var thread = this.props.thread
    var lastMessage = thread.lastMessage;
    var className = Exim.cx({
      'thread-list-item': true,
      'unread': !lastMessage.isRead
    })

    return (
      React.createElement(ListItem, {className: className, to: "message", params: {id: thread.id}}, 
        React.createElement("h5", {className: "thread-name"}, thread.name), 
        React.createElement("div", {className: "thread-time"}, 
          lastMessage.date.toLocaleTimeString()
        ), 
        React.createElement("div", {className: "thread-last-message"}, 
          lastMessage.text
        )
      )
    )
  }
})

module.exports = ThreadListItem

});

;require.register("components/ThreadSection", function(exports, require, module) {
var ThreadListItem = require('./ThreadListItem');
var threadsActions = require('actions/threads');
var threadsStore   = require('stores/threads');

var ThreadSection = React.createClass({displayName: 'ThreadSection',
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
        React.createElement(ThreadListItem, {key: threadID, thread: thread})
      );
    }, this);

    return (
      React.createElement("div", {className: "thread-section"}, 
        React.createElement("div", {className: "thread-count"}, 
          React.createElement("span", null, "Unread threads: ", this.state.unread)
        ), 
        React.createElement("ul", {className: "thread-list"}, 
          threadListItems
        )
      )
    );
  }

});

module.exports = ThreadSection;

});

require.register("config", function(exports, require, module) {
var config = {}

module.exports = config

});

;require.register("init", function(exports, require, module) {
module.exports = function() {
  localStorage.clear();
  localStorage.setItem('messages', JSON.stringify([
    {
      id: 'm_1',
      threadID: 't_1',
      threadName: 'Jing and Bill',
      authorName: 'Bill',
      text: 'Hey Jing, want to give a Flux talk at ForwardJS?',
      timestamp: Date.now() - 99999
    },
    {
      id: 'm_2',
      threadID: 't_1',
      threadName: 'Jing and Bill',
      authorName: 'Bill',
      text: 'Seems like a pretty cool conference.',
      timestamp: Date.now() - 89999
    },
    {
      id: 'm_3',
      threadID: 't_1',
      threadName: 'Jing and Bill',
      authorName: 'Jing',
      text: 'Sounds good.  Will they be serving dessert?',
      timestamp: Date.now() - 79999
    },
    {
      id: 'm_4',
      threadID: 't_2',
      threadName: 'Dave and Bill',
      authorName: 'Bill',
      text: 'Hey Dave, want to get a beer after the conference?',
      timestamp: Date.now() - 69999
    },
    {
      id: 'm_5',
      threadID: 't_2',
      threadName: 'Dave and Bill',
      authorName: 'Dave',
      text: 'Totally!  Meet you at the hotel bar.',
      timestamp: Date.now() - 59999
    },
    {
      id: 'm_6',
      threadID: 't_3',
      threadName: 'Functional Heads',
      authorName: 'Bill',
      text: 'Hey Brian, are you going to be talking about functional stuff?',
      timestamp: Date.now() - 49999
    },
    {
      id: 'm_7',
      threadID: 't_3',
      threadName: 'Bill and Brian',
      authorName: 'Brian',
      text: 'At ForwardJS?  Yeah, of course.  See you there!',
      timestamp: Date.now() - 39999
    }
  ]));
}


});

;require.register("lib/request", function(exports, require, module) {

});

;require.register("lib/utils", function(exports, require, module) {
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

});

require.register("routes", function(exports, require, module) {
var Route = ReactRouter.Route;

var mount = function (name) {
  return require('components/' + name);
};

module.exports = (
  React.createElement(Route, {handler: mount("App"), path: "/"}, 
    React.createElement(Route, {name: "message", handler: mount("MessageSection"), path: "threads/:id"})
  )
);

});

require.register("stores/app", function(exports, require, module) {
var actions = require('actions/app');
var routes  = require('routes');
var init    = require('init');

var store = Exim.createStore({
  actions: actions,

  willStart: function () {
    init()
  },
  onStart: function () {
    ReactRouter.run(routes, ReactRouter.HistoryLocation, function (Handler) {
      React.render(React.createElement(Handler, null), document.body)
    })
  }
})

module.exports = store

});

;require.register("stores/messages", function(exports, require, module) {
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

});

;require.register("stores/threads", function(exports, require, module) {
var actions = require('actions/threads');
var utils = require('lib/utils');

var store = Exim.createStore({
  actions: actions,

  getInitial: function () {
    return {
      threads: {},
      currentID: null,
      unread: 0
    }
  },

  willRecieveThreads: function () {
    var messages = utils.getAndParse('messages').map(utils.dateSetter).sort(utils.dateComparator);
    return utils.getThreads(messages)
  },

  recieveThreads: function (threads) {
    this.update('threads', threads)
  },

  didRecieveThreads: function () {
    actions.updateUnread()
  },

  updateCurrent: function (id) {
    this.update('currentID', id);
  },

  updateLast: function (message) {
    var threads = this.get('threads');
    var thread = threads[message.threadID];
    thread.lastMessage = message;
    this.update('threads', threads);
  },

  updateUnread: function (threadId, value) {
    var lastMessage;
    var threads = this.get('threads');

    if (threadId) {
      var thread  = threads[threadId];
      thread.lastMessage.isRead = value || true;
      this.update('threads', threads);
    }

    var unread = 0;
    for (key in threads) {
      if (lastMessage = threads[key].lastMessage) {
        if (!lastMessage.isRead) unread++;
      }
    }
    this.update('unread', unread);
  }

})

module.exports = store

});

;require.register("stores/unreadThread", function(exports, require, module) {

});

;
//# sourceMappingURL=app.js.map