import utils from './utils'
import helpers from './helpers'

function getFilePath(name) {
  let segments = name.split('-');
  let filePath;
  if (segments.length > 1) {
    filePath = segments.map(function(name, i){
      if (i>0)
        return name.charAt(0).toUpperCase() + name.slice(1)
      return name
    }).join('/');
  } else {
    filePath = name + '/' + name.charAt(0).toUpperCase() + name.slice(1);
  }
  return filePath;
}

function getFilePath(name) {
  let segments = name.split('-');
  let filePath;
  if (segments.length > 1) {
    filePath = segments.map(function(name, i){
      if (i>0)
        return name.charAt(0).toUpperCase() + name.slice(1)
      return name
    }).join('/');
  } else {
    filePath = name + '/' + name.charAt(0).toUpperCase() + name.slice(1);
  }
  return filePath;
}

function getRouter () {
  const Router = {};

  if (typeof ReactRouter !== 'undefined') {
    let routerElements = ['Route', 'DefaultRoute', 'RouteHandler', 'ActiveHandler', 'NotFoundRoute', 'Redirect'],
    routerMixins = ['Navigation', 'State'],
    routerFunctions = ['create', 'createDefaultRoute', 'createNotFoundRoute', 'createRedirect', 'createRoute', 'createRoutesFromReactChildren', 'run'],
    routerObjects = ['HashLocation', 'History', 'HistoryLocation', 'RefreshLocation', 'StaticLocation', 'TestLocation', 'ImitateBrowserBehavior', 'ScrollToTopBehavior'],
    copiedItems = routerMixins.concat(routerFunctions).concat(routerObjects);

    routerElements.forEach(function(name) {
      Router[name] = React.createElement.bind(React, ReactRouter[name]);
    });

    copiedItems.forEach(function(name) {
      Router[name] = ReactRouter[name];
    });

    Router['mount'] = function(path) {
      console.log('Exim.Router.mount is not defined');
    }

    Router['Link'] = function(args, children) {
      if ('class' in args) {
        args.className = args['class'];
        delete args['class'];
      }
      return React.createElement(ReactRouter['Link'], args, children);
    }

    Router['match'] = function(name, handler, args, children) {
      if (typeof args === 'undefined' && Array.isArray(handler)) {
        children = handler;
        args = {};
        handler = Router.mount(getFilePath(name));
      } else if (typeof args === 'undefined' && typeof handler === 'object'){
        args = handler;
        handler = Router.mount(getFilePath(name));
      } else if (typeof handler === 'object' && Array.isArray(args)) {
        children = args;
        args = handler;
        handler = Router.mount(getFilePath(name));
      }
      let path, key, def;

      if (typeof args === 'object') {
        path = args.path;
        key = args.key;
        def = args.default;
      }

      // if (typeof path === 'undefined' && (typeof def === 'undefined' || def === false))
      //   path = name;

      if (def === true) {
        return Router['DefaultRoute']({name, path, handler, key}, children);
      }

      return Router['Route']({name, path, handler, key}, children);
    };
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
        if (attributes.class != null) {
          attributes.className = attributes.class;
        }
        if (typeof attributes.className === 'object') {
          attributes.className = helpers.cx(attributes.className);
        }
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
