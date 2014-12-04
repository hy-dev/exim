var routes = require('routes');
var utils = require('lib/utils');

document.addEventListener('DOMContentLoaded', function() {
  utils.initLocalStorage();
  Exim.startRouting(routes, document.body);
}, true);
