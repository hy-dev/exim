const hasOwn = {}.hasOwnProperty;

export default {
  cx: function() {
    let classes = '';

    for (let i = 0; i < arguments.length; i++) {
      const arg = arguments[i];
      if (!arg) continue;

      const argType = typeof arg;

      if (argType === 'string' || argType === 'number') {
        classes += ' ' + arg;
      } else if (Array.isArray(arg)) {
        classes += ' ' + this.cx.apply(this, arg);
      } else if (argType === 'object') {
        let key;
        for (key in arg) {
          if (hasOwn.call(arg, key) && arg[key]) {
            classes += ' ' + key;
          }
        }
      }
    }

    return classes.substr(1);
  }
};
