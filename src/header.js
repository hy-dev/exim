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
  var React = require('react');
  var ReactRouter = require('react-router');

  var Reflux = {};
