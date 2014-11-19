// var _ = require('./utils'),
//     Reflux = require('../src'),
//     Keep = require('./Keep'),
//

/**
 * Creates an action functor object. It is mixed in with functions
 * from the `PublisherMethods` mixin. `preEmit` and `shouldEmit` may
 * be overridden in the definition object.
 *
 * @param {Object} definition The action object definition
 */

var allowed = {preEmit:1,shouldEmit:1};

Reflux.createAction = function (definition) {

  definition = definition || {};

  for (var d in definition) {
    if (!allowed[d] && Reflux.PublisherMethods[d]) {
      throw new Error("Cannot override API method " + d +
        " in action creation. Use another method name or override it on Reflux.PublisherMethods instead."
      );
    }
  }

  var context = utils.extend({
      eventLabel: "action",
      emitter: new utils.EventEmitter(),
      _isAction: true
  },Reflux.PublisherMethods,definition);

  var functor = function() {
    functor[functor.sync?"trigger":"triggerAsync"].apply(functor, arguments);
  };

  utils.extend(functor,context);

  Keep.createdActions.push(functor);

  return functor;

};
