var actions = require('actions/app');
var routes  = require('routes');
var init    = require('init');

var store = Exim.createStore({
  actions: actions,
  start: function () {
    init();
    ReactRouter.run(routes, ReactRouter.HistoryLocation, function(Handler) {
      React.render(React.createElement(Handler, null), document.body)
    })
  }
})

module.exports = store
