import utils from './utils';
import helpers from './helpers';

const getFilePath = function(name) {
  const segments = name.split('-');
  let filePath;
  if (segments.length > 1) {
    filePath = segments.map(function(name, i) {
      if (i > 0) return name.charAt(0).toUpperCase() + name.slice(1);
      return name;
    }).join('/');
  } else {
    filePath = name + '/' + name.charAt(0).toUpperCase() + name.slice(1);
  }
  return filePath;
};

const globalOrRequire = (glob, mod) => {
  const g = typeof global !== 'undefined' ? global : window;
  if (g[glob]) return g[glob];
  try {
    return require(mod);
  } catch (e) {
    return;
  }
};

const ReactRouter = globalOrRequire('ReactRouter', 'react-router');
const ReactDOM = globalOrRequire('ReactDOM', 'react-dom');
const React = globalOrRequire('React', 'react');
React.DOM = ReactDOM;

export const getRouter = function() {
  const Router = {};

  if (typeof ReactRouter !== 'undefined') {
    let routerComponents, routerMixins, routerFunctions, routerObjects, copiedItems;
    const ReactRouter1 = !ReactRouter.DefaultRoute;

    if (ReactRouter1) {
      routerComponents = ['Router', 'Link', 'IndexLink', 'RoutingContext', 'Route', 'Redirect', 'IndexRoute', 'IndexRedirect'];
      routerMixins = ['Lifecycle', 'History', 'RouteContext'];
      routerFunctions = ['createRoutes', 'useRoutes', 'match', 'default'];
      routerObjects = ['PropTypes'];
    } else {
      routerComponents = ['Route', 'DefaultRoute', 'RouteHandler', 'ActiveHandler', 'NotFoundRoute', 'Redirect'];
      routerMixins = ['Navigation', 'State'];
      routerFunctions = ['create', 'createDefaultRoute', 'createNotFoundRoute', 'createRedirect', 'createRoute', 'createRoutesFromReactChildren', 'run'];
      routerObjects = ['HashLocation', 'History', 'HistoryLocation', 'RefreshLocation', 'StaticLocation', 'TestLocation', 'ImitateBrowserBehavior', 'ScrollToTopBehavior'];
    }

    copiedItems = routerMixins.concat(routerFunctions).concat(routerObjects);

    routerComponents.forEach(function(name) {
      Router[name] = React.createElement.bind(React, ReactRouter[name]);
    });

    copiedItems.forEach(function(name) {
      Router[name] = ReactRouter[name];
    });

    Router['Link'] = function(args, children) {
      if ('class' in args) {
        args.className = args['class'];
        delete args['class'];
      }
      return React.createElement(ReactRouter['Link'], args, children);
    };

    if (!ReactRouter1) {
      Router['match'] = function(name, handler, args, children) {
        if (typeof args === 'undefined' && Array.isArray(handler)) {
          children = handler;
          args = {};
          handler = Router.mount(getFilePath(name));
        } else if (typeof args === 'undefined' && typeof handler === 'object') {
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

        if (def === true) {
          return Router['DefaultRoute']({name, path, handler, key}, children);
        }

        return Router['Route']({name, path, handler, key}, children);
      };
    }
  }

  return Router;
};

const getDOM = function() {
  const DOMHelpers = {};

  if (typeof React !== 'undefined') {
    const tag = function(name, ...args) {
      let attributes;
      const first = args[0] && args[0].constructor;
      if (first === Object) {
        attributes = args.shift();
        if (attributes.class != null) {
          attributes.className = attributes.class;
          delete attributes.class;
        }
        if (typeof attributes.className === 'object') {
          attributes.className = helpers.cx(attributes.className);
        }
      } else {
        attributes = {};
      }
      return React.DOM[name].apply(React.DOM, [attributes].concat(args));
    };

    const bindTag = function(tagName) {
      return DOMHelpers[tagName] = tag.bind(this, tagName);
    };

    Object.keys(React.DOM).forEach(bindTag);

    DOMHelpers.space = function() {
      return React.DOM.span({
        dangerouslySetInnerHTML: {
          __html: '&nbsp;'
        }
      });
    };
  }
  return DOMHelpers;
};

export const Router = getRouter();
export const DOM = getDOM();

export const createView = function(id, classArgs) {
  if (typeof id === 'string') {
    classArgs._module = id;
    if (!classArgs.displayName) {
      var idComps = id.split('/');
      classArgs.displayName = idComps[idComps.length - 1];
    }
  } else {
    classArgs = id;
    id = null;
  }

  const ReactClass = React.createClass(classArgs);
  const ReactElement = React.createElement.bind(React.createElement, ReactClass);

  return ReactElement;
};
