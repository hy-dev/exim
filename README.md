# Exim.js

An architecture for HTML5 apps using Facebook's Flux.js library.

## Why Exim

1. React.js
2. Flux.js
3. Super easy React-based Router
4. Simplicity
5. First-class js & coffee with short-syntax.
6. Lightweight, no big deps
7. Brunch, Grunt, Gulp boilerplates. Bower, NPM, AMD & Common.js support
8. Conventions.

## Future vision

- Data fetcher
- Explicit state (https://github.com/dustingetz/react-cursor)

## Dependencies

Dependencies are specified in `bower.json`. They are:

- Bluebird - ultra-fast promises
- fetch - polyfill for in-browser AJAX `fetch()` API
- React - great library by Facebook

## Documentation

Still a big TODO. Some code:

```coffeescript
# 1. Define your React components.
App = ...
TwoPane = React.createClass
  render: ->
    div className: 'layout',
      Sidebar()
      @props.activeRouteHandler()


# 2. Define your routes.
{startHistory, match, defaultTo} = Exim.Router
routes = startHistory match 'app', App, path: '/',
  match 'feedback', FeedbackPage  # Each route handler is React view
  match 'terms', TermsPage        # @props.activeRouteHandler()
  match 'privacy', PrivacyPage    # is passed to each view.

  match TwoPane,
    match 'calendar', Calendar
    MessagesRoutes  # Easy nesting!

MessagesRoutes = [
  match 'messages', Messages,
    match 'new', Compose, path: 'new'
    match 'conversation', Conversation, path: ':id'
]

# 3. Launch your app.
React.render(routes, document.body)

```

## License

The MIT License (MIT)

Copyright (c) 2014 Paul Miller (http://paulmillr.com), Hellyeah LLC (http://hellyeah.is)

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
