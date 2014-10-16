  Fluxy = Fluxy;

  Fluxy.cx = function (classNames) {
    if (typeof classNames == 'object') {
      return Object.keys(classNames).filter(function(className) {
        return classNames[className];
      }).join(' ');
    } else {
      return Array.prototype.join.call(arguments, ' ');
    }
  };

  var domHelpers = {};

  var tag = function(name) {
    var args, attributes;
    args = [].slice.call(arguments, 1);
    var first = args[0] && args[0].constructor;
    if (first === Object) {
      attributes = args.shift();
    } else {
      attributes = {};
    }
    return React.DOM[name].apply(React.DOM, attributes.concat(args));
  };

  Object.keys(React.DOM).forEach(function(tagName) {
    domHelpers[tagName] = tag.bind(this, tagName);
  });

  Fluxy.DOM = domHelpers;

  return Fluxy;
});
