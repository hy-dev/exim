
  var toS = Object.prototype.toString;

  Exim.Router = {
    match: function(name, View) {
      var options = {};

      var routes = [].slice.call(arguments, 2);
      if (typeof name !== 'string') {
        routes = [View].concat(routes);
        View = name;
        name = null;
      }

      var firstRouteIsOptions = !(routes[0] && 'props' in routes[0]);
      if (routes[0] && firstRouteIsOptions) {
        options = routes[0];
        routes = routes.slice(1);
      }

      var opts = {handler: View};
      if (name) opts.name = name;
      if (options.path) opts.path = options.path;
      var args = [opts].concat(routes);

      return ReactRouter.Route.apply(ReactRouter.Route, args);
    },
    startHistory: function() {
      var routes = [].slice.call(arguments);
      return ReactRouter.Routes.apply(ReactRouter.Routes, [{location: 'history'}].concat(routes));
    },
    defaultTo: function(View) {
      return ReactRouter.DefaultRoute({handler: View});
    },
    Link: ReactRouter.Link,
    transitionTo: ReactRouter.transitionTo,
    goBack: ReactRouter.goBack,
    replaceWith: ReactRouter.replaceWith
  };

  return Exim;
});
