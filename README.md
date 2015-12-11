[![Build Status](https://travis-ci.org/hellyeahllc/exim.svg?branch=new-master)](https://travis-ci.org/hellyeahllc/exim)

# Exim.js

[hellyeah.is/exim](http://hellyeah.is/exim/)

An ultra-lightweight Flux-like architecture for HTML5 apps using Facebook's React library.

## Why

Because, we hate complexity. Redux is very complex. Adding Redux to your app won't solve any problem per se — you would need to add tons of Redux plugins.

Exim focuses on three things:

1. Simple actions with unidirectional flow. You cannot change app data from the outside.
2. Easy lifecycle management and optimistic updates. Those are solid requirements for many modern apps.
3. Being a first-class React citizen. Subscribing to a data or calling an action should never be complex.

```javascript
var User = Exim.createStore({
  actions: ['create'],
  create: {
    // Each action can simply be a function, or a "lifecycle" method.
    on: data => {
      // `this` is a current action's context which
      // is cleaned after the execution.
      this.previous = this.get('lastUser');
      // Optimistic set.
      this.set({lastUser: data});
      // Returns promise.
      return request.post('/v1/user', data);
    },
    did: response => {
      console.log('Success! The new user ID:', response.id);
    },
    didNot: () => {
      // Revert the optimistic update.
      this.set({lastUser: this.previous});
    },
    while: isFetching => {
      // Would be called twice: after `on` and before `did`
      // (when the promise is resolved).
      // Let's show a spinner while we're `post`ing stuff in `on`.
      this.set({isFetching: isFetching});
    }
  }
});

// In your view
React.createClass({
  mixins: [User.connect('isFetching')],
  create() {
    User.actions.create({name: 'Jonny Bravo'});
  },
  render() {
    if (this.isFetching) {
      return <div>Showing a spinner is as simple as that.</div>
    } else {
      return <div onClick={this.create}>Let's create something!</div>
    }
  }
});

```

## Dependencies

The only hard dependency is React.js.

## Changelog

### Exim 0.8.0 (Dec 11, 2015)

### Exim 0.7.0 (Aug 2015)

* Test release using Freezer.js for immutability.

### Exim 0.6.2 (22 May 2015)

1. Fix action's chain bug.

### Exim 0.6.1 (16 May 2015)

1. Implement **store.reset()** / **store.reset(prop)**.
2. Getter: Revert logic. Fix allowed methods bug.
3. while[Action]: Fix `didNot` case bug.
4. Fix *Unhandled rejection* error.

### Exim 0.6.0 (15 May 2015)

1. Massive reduce in size. Exim is only 4K now (when gzipped).
2. Dropped all dependencies. But of course you'll need to include React.
3. Massive simplification.
4. Rewritten in ES6.

### Exim 0.5.0 (6 May 2015)

1. Implement **Exim.createView**.
2. **Exim.Router** enhancements.
3. Add **Exim.helpers**.

### Exim 0.4.0 (9 Dec 2014)

Initial release.

## License

Exim is currently maintained by Paul Miller and Artem Yavorsky.

The MIT License (MIT)

Copyright (c) 2014 Hellyeah LLC http://hellyeah.is

With contributions by several individuals: https://github.com/hellyeahllc/exim/graphs/contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
