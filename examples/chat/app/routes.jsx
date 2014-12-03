var Route = ReactRouter.Route;
var App = require('./components/App');
var MessageSection = require('./components/MessageSection');

module.exports = (
  <Route handler={App} path="/">
    <Route name="message" handler={MessageSection} path="threads/:id" />
  </Route>
);
