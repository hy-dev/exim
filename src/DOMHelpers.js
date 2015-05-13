export const Router = getRouter();
export const DOM = getDOM();

export function createView (classArgs) {
  let ReactClass = React.createClass(classArgs);
  let ReactElement = React.createElement.bind(React.createElement, ReactClass);
  return ReactElement;
};

function getRouter () {
  let Router = {};
  if (ReactRouter) {
    let routerElements = ['Route', 'DefaultRoute', 'RouteHandler', 'ActiveHandler', 'NotFoundRoute', 'Link', 'Redirect'],
    routerMixins = ['Navigation', 'State'],
    routerFunctions = ['create', 'createDefaultRoute', 'createNotFoundRoute', 'createRedirect', 'createRoute', 'createRoutesFromReactChildren', 'run'],
    routerObjects = ['HashLocation', 'History', 'HistoryLocation', 'RefreshLocation', 'StaticLocation', 'TestLocation', 'ImitateBrowserBehavior', 'ScrollToTopBehavior'],
    copyItems = routerMixins.concat(routerFunctions).concat(routerObjects);

    for (item in routerElements) {
      Router[item] = React.createElement.bind(React.createElement, ReactRouter[item]);
    }

    for (item in copyItems) {
      Router[item] = ReactRouter[item]
    }
  }
  return Router;
}

function getDOM () {
  if (typeof React !== 'undefined') {
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

    domHelpers;

    // Exim.addTag = function (name, tag) {
    //   DOM[name] = tag;
    // }
  }
}
