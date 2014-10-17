(function() {

  var actions,
  constants = Toothpaste.createConstants({
    serviceMessages: ['TEST_SERVICE'],
    messages: ['TEST_SIMPLE']
  })

  module("Action", {

    setup: function() {
      actions = Toothpaste.createActions({
        serviceActions: {
          testService: [constants.TEST_SERVICE, function() {
            return new Promise(function(r){return r(true)})
          }]
        }
      })
    }
  });

  test("constructor", 1, function () {
    ok(actions.testService)
  })

})();
