**[[PRE-RELEASE]]. Public release is expected soon. Please don't publicly share links to Exim for now.**

[![Build Status](https://travis-ci.org/stelmakh/exim.svg?branch=new-master)](https://travis-ci.org/stelmakh/exim)

# Exim.js

[hellyeah.is/exim](http://hellyeah.is/exim/)

An architecture for HTML5 apps using Facebook's Flux.js library.

Standing on the shoulders of giants

## 8 reasons why Exim

1. React.js - using the great Facebook base
2. Flux.js - new architecture from Facebook, modern replacement for MVC.
3. Intelligible React-based Router
4. Tremendeously simple structure.
5. First-class JS & coffeescript with support for short syntax.
6. Lightweight, no big dependencies.
7. Brunch, Grunt, Gulp boilerplates. Bower, NPM, Browserify, AMD & Common.js support
8. Great conventions.

## Dependencies

The only hard dependency is React.js.

Optional dependency: **Bluebird** - ultra-fast promises

## Changelog

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
