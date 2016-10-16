const utils = {};
const _objectClass = '[object Object]';
const idFormat = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
const pad = 16;

utils.getWithoutFields = function(outcast, target) {
  if (!target) throw new Error('TypeError: target is not an object.');
  const result = {};
  if (typeof outcast === 'string') outcast = [outcast];
  const tKeys = Object.keys(target);
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

utils.isObject = function(targ) {
  return targ ? targ.toString() === _objectClass : false;
};

utils.isDate = function(date) {
  return date instanceof Date;
};

utils.capitalize = function(str) {
  const first = str.charAt(0).toUpperCase();
  const rest = str.slice(1);
  return `${first}${rest}`;
};

utils.generateId = function() {
  return idFormat.replace(/[xy]/g, c => {
    const r = Math.random() * pad | 0;
    const v = c === 'x' ? r : (r & 3 | pad / 2);
    return v.toString(pad);
  });
};

utils.extend = (...objects) => {
  const result = {};
  objects.forEach((object) => {
    let key;
    for (key in object) {
      result[key] = object[key];
    }
  });
  return result;
};

utils.copyValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(utils.copyValue);
  } else if (utils.isObject(value)) {
    return utils.extend(value);
  } else if (utils.isDate(value)) {
    return new Date(value);
  } else {
    return value;
  }
};

utils.bindValues = (object, scope) => {
  const result = {};
  let key;
  for (key in object) {
    result[key] = object[key].bind(scope);
  }
  return result;
};

export default utils;
