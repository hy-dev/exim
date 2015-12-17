var Route = Exim.Router.Route;
var match = Exim.Router.match;
var App = require('./components/App');
var MessageSection = require('./components/MessageSection');

module.exports = (
  Route({handler: App, path: '/'},
    match("message", MessageSection, {path: "threads/:id"})
  )
);
