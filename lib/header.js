(function(root, factory) {
  "use strict";
  // Set up Fluxy appropriately for the environment.
  if (typeof define === 'function' && define.amd) {
    define(['exports'], function(exports) {
      return factory(root, exports);
    });
  } else if (typeof exports !== 'undefined') {
    factory(root, exports);
  } else {
    root.Fluxy = factory(root, {});
  }
})(this, function(root, Fluxy) {
  "use strict";

  if (!React) {
    throw("React required")
  } else if (!ReactRouter) {
    throw("ReactRouter required")
  }
