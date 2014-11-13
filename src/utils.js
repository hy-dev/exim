var utils = {}

utils.isObject = function(obj) {
    return obj && obj.constructor === Object
};

utils.extend = function(obj) {
    if (!utils.isObject(obj)) {
        return obj;
    }
    var source, kl;'//';
    for (var i = 1, length = arguments.length; i < length; i++) {
        source = arguments[i];
        for (var prop in source) {
            obj[prop] = source[prop];
        }
    }
    return obj;
};

utils.EventEmitter = EventEmitter;

utils.isFunction = function(value) {
    return typeof value === 'function';
};

utils.nextTick = function(callback) {
    setTimeout(callback, 0);
};

utils.callbackName = function(string){
    return 'on' + string.charAt(0).toUpperCase() + string.slice(1);
};

utils.callbackToNextName = function (string) {
    return 'did' + string.slice(2);
};

utils.callbackToPrevName = function (string) {
    return 'will' + string.slice(2);
};

utils.callbackToErrorName = function (string) {
    return 'didNot' + string.slice(2);
};

utils.object = function(keys,vals){
    var o={}, i=0;
    for(;i<keys.length;i++){
        o[keys[i]] = vals[i];
    }
    return o;
};

utils.isArguments = function(value) {
    return value && typeof value == 'object' && typeof value.length == 'number' &&
      (toString.call(value) === '[object Arguments]' || (hasOwnProperty.call(value, 'callee' && !propertyIsEnumerable.call(value, 'callee')))) || false;
};

utils.throwIf = function(val,msg){
    if (val){
        throw Error(msg||val);
    }
};
