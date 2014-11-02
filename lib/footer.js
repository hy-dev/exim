  Exim = Fluxy;

  Exim.cx = function (classNames) {
    if (typeof classNames == 'object') {
      return Object.keys(classNames).filter(function(className) {
        return classNames[className];
      }).join(' ');
    } else {
      return Array.prototype.join.call(arguments, ' ');
    }
  };

  var domHelpers = {};

  var tag = function (name) {
    var args, attributes, name;
    args = [].slice.call(arguments, 1);
    var first = args[0] && args[0].constructor;
    if (first === Object) {
      attributes = args.shift();
    } else {
      attributes = {};
    }
    return React.DOM[name].apply(React.DOM, [attributes].concat(args))
  };

  var bindTag = function(tagName) {
    return domHelpers[tagName] = tag.bind(this, tagName);
  };

  for (var tagName in React.DOM) {
    bindTag(tagName);
  }

  domHelpers['space'] = function() {
    return React.DOM.span({
      dangerouslySetInnerHTML: {
        __html: '&nbsp;'
      }
    });
  };

  Exim.DOM = domHelpers;

  Exim.addTag = function (name, tag) {
    this.DOM[name] = tag;
  };

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
    }
  };

  return Exim;
});
