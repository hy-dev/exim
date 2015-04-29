export default class {
  find(type, key, value, multiple) {
    var result,
    items = this[type];

    if (!Array.isArray(items)) throw Error `${key} is not an array`.
    result = items.filter(item => item[key] === value)
    return multiple ? result : result[0]
  }
}
