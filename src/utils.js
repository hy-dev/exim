const utils = {};

utils.getWithoutFields = function(outcast, target) {
  if (!target) throw new Error('TypeError: target is not an object.');
  var result = {};
  if (typeof outcast === 'string') outcast = [outcast];
  var tKeys = Object.keys(target);
  outcast.forEach(function(fieldName) {
    tKeys
      .filter(function(key) {
        return key !== fieldName;
      })
      .forEach(function(key) {
        result[key] = target[key];
      });
  });
  return result;
};

utils.objectToArray = function(object) {
  return Object.keys(object).map(key => object[key]);
};

utils.classWithArgs = function(Item, args) {
  return Item.bind.apply(Item, [Item].concat(args));
};

// 1. will
// 2. while(true)
// 3. on
// 4. while(false)
// 5. did or didNot
utils.mapActionNames = function(object) {
  const list = [];
  const prefixes = ['will', 'whileStart', 'on', 'whileEnd', 'did', 'didNot'];
  prefixes.forEach(item => {
    let name = item;
    if (item === 'whileStart' || item === 'whileEnd') {
      name = 'while';
    }
    if (object[name]) {
      list.push([item, object[name]]);
    }
  });
  return list;
};

const _objectClass = '[object Object]';
utils.isObject = function(targ) {
  return targ ? targ.toString() === _objectClass : false;
};

utils.capitalize = function(str) {
  const first = str.charAt(0).toUpperCase();
  const rest = str.slice(1);
  return `${first}${rest}`;
};

const idFormat = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
const pad = 16;
utils.generateId = function() {
  return idFormat.replace(/[xy]/g, c => {
    let r = Math.random() * pad | 0;
    const v = c === 'x' ? r : (r & 3 | pad / 2);
    return v.toString(pad);
  });
};

export default utils;
