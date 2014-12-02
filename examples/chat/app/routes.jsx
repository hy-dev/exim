var Route = ReactRouter.Route;

var mount = function (name) {
  return require('components/' + name);
};

module.exports = (
  <Route handler={mount("App")} path="/">
    <Route name="message" handler={mount("MessageSection")} path="threads/:id" />
  </Route>
);
