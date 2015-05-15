import utils from './utils'

function getRouter () {
  const Router = {};
  if (typeof ReactRouter !== 'undefined') {
    let routerElements = ['Route', 'DefaultRoute', 'RouteHandler', 'ActiveHandler', 'NotFoundRoute', 'Link', 'Redirect'],
    routerMixins = ['Navigation', 'State'],
    routerFunctions = ['create', 'createDefaultRoute', 'createNotFoundRoute', 'createRedirect', 'createRoute', 'createRoutesFromReactChildren', 'run'],
    routerObjects = ['HashLocation', 'History', 'HistoryLocation', 'RefreshLocation', 'StaticLocation', 'TestLocation', 'ImitateBrowserBehavior', 'ScrollToTopBehavior'],
    copiedItems = routerMixins.concat(routerFunctions).concat(routerObjects);

    routerElements.forEach(function(name) {
      Router[name] = React.createElement.bind(React, ReactRouter[name]);
    });

    copiedItems.forEach(function(name) {
      Router[itemName] = ReactRouter[itemName];
    });
  }
  return Router;
}

function getDOM () {
  const DOMHelpers = {};

  if (typeof React !== 'undefined') {
    let tag = function (name, ...args) {
      let attributes;
      let first = args[0] && args[0].constructor;
      if (first === Object) {
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
