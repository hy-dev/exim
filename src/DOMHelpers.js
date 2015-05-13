export createView function (classArgs) {
  let ReactClass = React.createClass(classArgs);
  let ReactElement = React.createElement.bind(React.createElement, ReactClass);
  return ReactElement;
};

export Router getRouter();

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
