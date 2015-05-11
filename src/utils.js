var utils = {}

utils.getWithoutFields = function (outcast, target) {
  if (!target) throw new Error('TypeError: target is not an object.');
  var result = {};
  if (typeof outcast === 'string') outcast = [outcast];
  for (var fieldName in outcast)
    for (var key in target)
      if (target.hasOwnProperty(key) && key !== fieldName)
        result[key] = target[key];
  return result;
};

utils.objectToArray = function (object) {
  return Object.keys(object).map(key => object[key])
}

utils.capitalize = function (str) {
  var first = str.charAt(0).toUpperCase();
  var rest = str.slice(1);
  return `${first}${rest}`;
}

export default utils
