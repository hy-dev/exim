var routes = require('routes');
var utils = require('lib/utils');

document.addEventListener('DOMContentLoaded', function() {
  utils.initLocalStorage();
  ReactRouter.run(routes, function (Handler) {
    React.render(React.createElement(Handler, null), document.body);
  });
}, true);
