(function(root, factory) {
  "use strict";
  // Set up Toothpaste appropriately for the environment.
  if (typeof define === 'function' && define.amd) {
    define(['exports'], function(exports) {
      return factory(root, exports);
    });
  } else if (typeof exports !== 'undefined') {
    factory(root, exports);
  } else {
    root.Toothpaste = factory(root, {});
  }
})(this, function(root, Toothpaste) {
  "use strict";

  // Flux
  // Fluxy
  // Router
  // Data fetcher
  // stuff for global data access (https://github.com/dustingetz/react-cursor)
  // conventions
  // coffee DOM helpers / addons


  // Brunch first-class support
  // grunt / gulp / broccoli skeletols
  // git@github.com:hellyeahllc/toothpaste.git



  /*
   * Copyright (c) 2014, Facebook, Inc.
   * All rights reserved.
   *
   * This source code is licensed under the BSD-style license found in the
   * LICENSE file in the root directory of this source tree. An additional grant
   * of patent rights can be found in the PATENTS file in the same directory.
   *
   * @providesModule Dispatcher
   * @typechecks
   */


  /**
   * Use invariant() to assert state which your program assumes to be true.
   *
   * Provide sprintf-style format (only %s is supported) and arguments
   * to provide information about what broke and what you were
   * expecting.
   *
   * The invariant message will be stripped in production, but the invariant
   * will remain to ensure logic does not differ in production.
  **/

  if (!React) {
    throw("React required")
  } else if (!ReactRouter) {
    throw("ReactRouter required")
  }
