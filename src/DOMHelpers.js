import utils from './utils';
import helpers from './helpers';
import React from 'react';
import ReactDOM from 'react-dom';
import ReactRouter from 'react-router';
import createClass from 'create-react-class';

const TAG_NAMES = [
  'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 'big',
  'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
  'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head',
  'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'keygen', 'label',
  'legend', 'li', 'link', 'main', 'map', 'mark', 'menu', 'menuitem', 'meta', 'meter', 'nav', 'noscript',
  'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture', 'pre', 'progress', 'q', 'rp',
  'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span', 'strong',
  'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead',
  'time', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr', 'circle', 'clipPath', 'defs',
  'ellipse', 'g', 'image', 'line', 'linearGradient', 'mask', 'path', 'pattern', 'polygon', 'polyline',
  'radialGradient', 'rect', 'stop', 'svg', 'text', 'tspan'
];

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

export const getRouter = function() {
  const Router = {};

  if (typeof ReactRouter !== 'undefined') {
    let routerComponents, routerMixins, routerFunctions, routerObjects;
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

    const copiedItems = routerMixins.concat(routerFunctions).concat(routerObjects);

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
    const tag = function(tagName, ...args) {
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

      return React.createElement(name, attributes, ...args);
    };

    TAG_NAMES.forEach(tagName => {
      return DOMHelpers[tagName] = tag.bind(null, tagName);
    });

    DOMHelpers.space = function() {
      return React.createElement('span', {
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

  const ReactClass = createClass(classArgs);
  const ReactElement = React.createElement.bind(React.createElement, ReactClass);

  return ReactElement;
};
