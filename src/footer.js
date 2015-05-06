
  var toS = Object.prototype.toString;

  if (typeof ReactRouter === "object") {
    var routerElements, routerMixins, routerFunctions, routerObjects, copyItems;

    routerElements = ['Route', 'DefaultRoute', 'RouteHandler', 'ActiveHandler', 'NotFoundRoute', 'Link', 'Redirect'];
    routerMixins = ['Navigation', 'State'];
    routerFunctions = ['create', 'createDefaultRoute', 'createNotFoundRoute', 'createRedirect', 'createRoute', 'createRoutesFromReactChildren', 'run'];
    routerObjects = ['HashLocation', 'History', 'HistoryLocation', 'RefreshLocation', 'StaticLocation', 'TestLocation', 'ImitateBrowserBehavior', 'ScrollToTopBehavior'];
    copyItems = routerMixins.concat(routerFunctions).concat(routerObjects);

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

    for (var i = 0; i < routerElements.length; i++) {
      var elementName = routerElements[i];
      Exim.Router[elementName] = React.createElement.bind(React.createElement, ReactRouter[elementName]);
    }

    for (var i = 0; i < copyItems.length; i++) {
      var itemName = copyItems[i];
      Exim.Router[itemName] = ReactRouter[itemName];
    }
  }

  Exim.createView = function (classArgs) {
    var ReactClass = React.createClass(classArgs);
    var ReactElement = React.createElement.bind(React.createElement, ReactClass);
    return ReactElement;
  };

  Exim.createAction = Reflux.createAction;
  Exim.createActions = Reflux.createActions;
  Exim.createStore = Reflux.createStore;

  return Exim;
});
