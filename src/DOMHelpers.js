import utils from './utils'

function getRouter () {
  const Router = {};
  if (typeof ReactRouter !== 'undefined') {
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
  const DOMHelpers = {};

  if (typeof React !== 'undefined') {
    let tag = function (name, ...args) {
      let attributes, name;
      let first = args[0] && args[0].constructor;
      // if (first === Object) {
      if (utils.isObject(first)) {
        attributes = args.shift();
      } else {
        attributes = {};
      }
      return React.DOM[name].apply(React.DOM, [attributes].concat(args))
    };

    let bindTag = function(tagName) {
      return DOMHelpers[tagName] = tag.bind(this, tagName);
    };

    for (let tagName in React.DOM) {
      bindTag(tagName);
    }

    DOMHelpers['space'] = function() {
      return React.DOM.span({
        dangerouslySetInnerHTML: {
          __html: '&nbsp;'
        }
      });
    };

    Exim.addTag = function (name, tag) {
      DOMHelpers[name] = tag;
    }
  }
  return DOMHelpers;
}

export const Router = getRouter();
export const DOM = getDOM();

export function createView (classArgs) {
  let ReactClass = React.createClass(classArgs);
  let ReactElement = React.createElement.bind(React.createElement, ReactClass);
  return ReactElement;
};
