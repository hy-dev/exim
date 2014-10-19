  Exim = Fluxy;

  Exim.cx = function (classNames) {
    if (typeof classNames == 'object') {
      return Object.keys(classNames).filter(function(className) {
        return classNames[className];
      }).join(' ');
    } else {
      return Array.prototype.join.call(arguments, ' ');
    }
  };

  var domHelpers = {};

  var tag = function (name) {
    var args, attributes, name;
    args = [].slice.call(arguments, 1);
    var first = args[0] && args[0].constructor;
    if (first === Object) {
      attributes = args.shift();
    } else {
      attributes = {};
    }
    return React.DOM[name].apply(React.DOM, [attributes].concat(args))
  };

  var bindTag = function(tagName) {
    return domHelpers[tagName] = tag.bind(this, tagName);
  };

  for (var tagName in React.DOM) {
    bindTag(tagName);
  }

  domHelpers['space'] = function() {
    return React.DOM.span({
      dangerouslySetInnerHTML: {
        __html: '&nbsp;'
      }
    });
  };

  Exim.DOM = domHelpers;

  Exim.addTag = function (name, tag) {
    this.DOM[name] = tag
  }

  return Exim;
});
