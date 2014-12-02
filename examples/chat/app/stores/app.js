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
