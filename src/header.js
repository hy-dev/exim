(function(root, factory) {
  "use strict";
  // Set up Reflux appropriately for the environment.
  if (typeof define === 'function' && define.amd) {
    define(['exports'], function(exports) {
      return factory(root, exports);
    });
  } else if (typeof exports !== 'undefined') {
    var f = factory(root, exports);

  } else {
    root.Exim = factory(root, {});
  }
})(this, function(root, Reflux) {
  "use strict";
  var React, ReactRouter;
  var Reflux = {};

  if (typeof define === 'function' && define.amd) {
    React = require('react');
    ReactRouter = require('react-router');
  }
  else if (typeof module === 'object' && module.exports){
    React = module.exports.React;
    ReactRouter = module.exports.ReactRouter;
  }
  else {
    React = window.React;
    ReactRouter = window.ReactRouter;
  }
