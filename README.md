# Exim.js

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

Dependencies are specified in `bower.json`. They are:

- **Bluebird** - ultra-fast promises
- **fetch** - polyfill for in-browser AJAX `fetch()` API
- **React** - great library by Facebook

## Documentation

Exim apps consist of four things:

1. Actions
2. Stores
3. Views (React components)
4. Routes

Exim confirms to Flux architecture, which means application flow is one-way and looks like this:

- Action -> Store -> View
- Action -> (hits corresponding Store methods) -> Store -> (publishes changes to all view-listeners) -> View

You may be familiar with actions, stores and views if you've ever built Flux apps before. If not, it's quite simple.

### Actions

Simple abstractions which do one thing. They have empty bodies and don't return anything.

```javascript
var greet = Exim.createAction('greet')
greet()  // Doesn't do anything.

// Multiple.
var actions = Exim.createActions(['work', 'eat', 'sleep'])
actions.eat()   // Still
actions.sleep() // won't do
actions.work()  // anything.
```

### Stores

Stores subscribe to actions and provide actual functionality which happens behind the scenes. This may include making an API request, storing something in IndexedDB or LocalStorage.

Stores have `listenables` property which

```javascript
var actions = Exim.createActions(['work', 'eat'])
var Users = Exim.createStore({
  listenables: actions  // Listen for actions.
})
// you can now declare store methods:
// - willWork, onWork, didWork
// - willEat,  onEat,  didEat
```

**Main difference between MVC models and stores** is that Stores don't have setters. Updating the data is done via actions.

```javascript
actions.eat() // to change store data. Not UserStore.set() or something.
```

### Views

Views are simple react components. They represent page content & HTML.

HTML markup is usually inlined into components via JSX language.

```javascript
var Clinic = Exim.createView({ // same as `React.createClass`
  render: function() {
    var perDay = this.props.patients / 365;
    return <div>
      Welcome to {this.props.name}.
      We have <strong>{perDay}</strong> patients every day.
    </div>
  }
});

var PageContent = Exim.createView({
  render: function() {
    return <Clinic name="Hong Kong Health" patients=55400 />
  }
})
```

If you prefer CoffeeScript, we got you covered:

```coffeescript
# Exim loves coffee. No JSX, pure functions.
{div, h2, p, ul, li} = Exim.DOM
Cafe = Exim.createView
  refreshList: ->
    actions.refreshList()

  render: ->
    div className: "red cafe",
      h2 "The most fancy #{@props.city} french restraunt"
      p "What would you like to order?"
      ul onClick: @refreshList,
        li "Fua-gra"
        li "Fondue"
        li "Tasty blue frog"

# Use it like that, or inline into another component.
Cafe city: 'Prague'
```

Here's a full app structure using actions, stores and views:

```javascript

var userActions = Exim.createActions(['eat', 'drink'])

// the actual work happens here:
var Users = Exim.createStore({
  listenables: actions,
  init: function() {
    this.update({type: '', with: '', food: ''})
  },
  onEat: function(food) {
    this.update({type: 'Brunch', with: 'Chaplin', food: food})
  },
  onDrink: function(drink) {
    this.update({type: 'Brunch', with: 'Chaplin', food: 'liquid ' + drink})
  }
})

var UserView = Exim.createView({
  mixins: [Exim.connect(Users)],
  render: function() {
    var s = this.state; // just a convenience. In ES6: {food, friend, type} = this.state
    var food = s.food;
    var friend = s.with;
    var type = s.type;
    return <div>Eating some {food} with {friend} over {type};</div>
  }
})

userActions.eat('Omelette')
userActions.drink('Porridge')

```

### Routes

Routes represent browser URLs in your application.

They basically take views and map them to URLs.

```javascript
var startHistory = Exim.Router.startHistory;
var match = Exim.Router.match;

match('app', App, {path: '/'},
  match('feedback', FeedbackPage),
  match('terms', TermsPage),
  match('info', Cafe, {path: 'cafe-info'})
)
```


```coffeescript
# 1. Define your React components.
App = ...
TwoPane = React.createClass
  render: ->
    div className: 'layout',
      Sidebar()
      @props.activeRouteHandler()


# 2. Define your routes.
{startHistory, match} = Exim.Router
routes = startHistory
  match 'app', App, path: '/',
    match 'feedback', FeedbackPage  # Each route handler is a React view
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

## Future TODO

- Data fetcher
- Explicit state (https://github.com/dustingetz/react-cursor)

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
