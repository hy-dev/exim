var utils = {}

utils.inherits = function(ctor, parent) {
    ctor.super_ = parent;
    ctor.prototype = Object.create(parent.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };

utils.extend = function(obj, item) {
  for (var key in item) obj[key] = item[key];
  return obj;
};

utils.convertName = function (name) {
  var low = name.toLowerCase();
  var res = low.replace(/_(\w{1})/g, function (match, letter) {
    return letter.toUpperCase();
  });
  return res;
};
