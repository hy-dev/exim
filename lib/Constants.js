/**
 * An Enum factory
 * @param {object} constants - a hash of constant values
 *
 * Creates a new Enum for the provided constants. There are three types of constants:
 *  * serviceMessages: automatically have complimented COMPLETED and FAILED messages created
 *  * messages: a string constant, where the value is the same as the key
 *  * values: a string -> constant value lookup
 *
 * serviceMessages and messages should be specified as Array<String>. Values should be a hash.
 *
 */

var ConstantsFactory = function (constants) {
  var values = {};
  if (constants) {
    if (constants.serviceMessages) {
      constants.serviceMessages.forEach(function (key) {
        var messages = [key, key+'_COMPLETED', key+'_FAILED'];
        messages.forEach(function (m) { values[m] = m; });
      });
    }
    if (constants.messages) {
      constants.messages.forEach(function (key) {
        values[key] = key;
      });
    }
    if (constants.values) {
      Object.keys(constants.values).forEach(function (key) {
        values[key] = constants.values[key];
      });
    }
  }

  var result = {};
  var enums = [];
  Object.keys(values).forEach(function(key, index) {
    result[key] = {
      key: key,
      value: values[key]
    }
    enums.push(result[key])
  });
  result.enums = enums;
  return result;
};
