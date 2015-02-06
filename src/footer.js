
  var toS = Object.prototype.toString;

  if (typeof ReactRouter === "object") {
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
      startRouting: function(routes, element) {
        return ReactRouter.run(routes, ReactRouter.HistoryLocation, function(Handler) {
          React.render(React.createElement(Handler, null), element)
        });
      },
      defaultTo: function(View) {
        return ReactRouter.DefaultRoute({handler: View});
      }
    };


    ['Link', 'transitionTo', 'goBack', 'replaceWith', 'Route', 'RouteHandler', 'State', 'Link'].forEach(function(name) {
      Exim.Router[name] = ReactRouter[name]
    });
  }

  Exim.createAction = Reflux.createAction;
  Exim.createActions = Reflux.createActions;
  Exim.createStore = Reflux.createStore;

  return Exim;
});
