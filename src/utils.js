var utils = {}

utils.getWithout = function (outcast, target) {
  if (!target) throw new Error('TypeError: target is not an object.');
  var result = {};
  for (var key in target) {
    if (target.hasOwnProperty(key) && key !== outcast)
      result[key] = target[key];
  }
  return result;
};

export default utils
