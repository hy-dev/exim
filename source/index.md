---
title: Exim.js API Reference

language_tabs:
- javascript
- coffeescript

toc_footers:
  - <a href='http://github.com/hellyeahllc/exim'>Sources on GitHub</a>

search: true
---

# Exim.js

Exim.js is a HTML5 application architecture using Facebook's [React.js](http://facebook.github.io/react/) / [Flux](http://facebook.github.io/flux/) libraries.

Exim takes Flux's simplicity and brings it to another level. We re-engineered Facebook's lib in order to make ultra-simple and convenient framework for real-world applications.

You can discuss the project on the [GitHub issues page](https://github.com/hellyeahllc/exim/issues), post questions to [Ost.io forum](http://ost.io/hellyeahllc/exim) or send tweets to [@hellyeahllc](https://twitter.com/hellyeahllc)

Exim is an open-source project by [Hell Yeah](http://hellyeah.is) available freely under the [MIT license]().

# Installation

To use Exim, get the latest release with bower. Or, simply use NPM.

```
bower install exim
# or
npm install exim
```

# Architecture

Exim applications have four major parts:

1. Actions
2. Stores
3. React Components
4. Routes

Exim is based on the Flux [architecture](http://facebook.github.io/flux/docs/overview.html).
Simply put, this means that instead of traditional MVC with bi-directional flow, everything flows in one direction.

```
components ---> (actions) ---> stores
^                                  |
|                                  V
- (publish changes to components) --
```

In other words, unlike MVC, you don't call stores directly.

## Differences from pure Flux

Flux architecture looks like this:

We still have stores, actions and the data flow which is unidirectional.

But, in Exim we:

1. Removed Dispatcher. We are using simpler approach: store joins and aggregates instead.
2. Made actions ultra-short. They don't have method bodies now. Instead, all logic is located in Stores.
3. Don't use constants for communicating between various app parts. Constants is old and unnecessary concept.
4. Radically simplified Stores and the way they consume actions.
5. Added optional helpers for CoffeeScript folks

```
Pure Flux
components ---> actions ---> Dispatcher ---> Callbacks ---> stores
^                                                           |
|                                                           V
------------- (publish changes to components) ---------------
```

# Actions

Actions are simple abstractions.
They don't do anything on their own, they just say out loud "action `sleep`" was activated, and then it's up to stores to do something useful based on that/

```javascript
var greet = Exim.createAction('greet')
greet()  // Doesn't do anything.

// Multiple.
var actions = Exim.createActions(['work', 'eat', 'sleep'])
actions.eat()   // Still
actions.sleep() // won't do
actions.work()  // anything.
```

```coffeescript
greet = Exim.createAction('greet')
greet()  # Doesn't do anything.

# Multiple.
actions = Exim.createActions(['work', 'eat', 'sleep'])
actions.eat()   # Still
actions.sleep() # won't do
actions.work()  # anything.
```

# Stores

Stores subscribe to, and react on, specific actions.
Usually, a store would perform an HTTP request in response to action and store the result.

## Actions and action handlers

To listen to specific actions, you pass an object of actions to the `actions` property.

Then, you have to define handlers for that actions.

For simple actions, define a function named exactly as the action.

For more complex actions, you can use a hash with `while`, `will`, `on`, `did`
and `didNot` properties.

```javascript
var People = Exim.createStore({
  actions: ['work', 'eat'],

  // Using simple handler function. Equal to onReset: function(){}
  // or reset: {on: fuction(){}}
  reset: function() {/* ... */},

  //Using hash
  eat: {
    while: function() {},
    will:  function() {},
    on:    function() {},
    did:   function() {},
    didNot:function() {}
  }
})
```

```coffeescript
People = Exim.createStore
  actions: ['work', 'eat']

  # Using simple handler function. Equal to onReset: -> ...
  # or reset: {on: -> ...}
  reset: -> # body

  # Using hash
  eat:
    while:  -> # some
    will:   -> # function
    on:     -> # body
    did:    -> # goes
    didNot: -> # here
```

## Action lifecycle

Action lifecycle includes five steps

1. `while`
2. `will`
3. `on`
4. `did`
5. `didNot`

The only required step is `on`, the rest of them are optional.

### while
A `while` step, if defined, runs twice, at the beginning and at the end, with the
`true` and `false` arguments passed respectively. It is usefull when you want to
perform some operations while the action is running(e.g. to show a spinner etc.)

### will
A `will` is used for preparatory operations. If it is defined, the arguments the
action is called with will be passed here. The result of the execution of a
`will` step is then passed to the `on` step

### on
The body of an action. The main operations are performed here(e.g. API
requests). Receives arguments either from the `will` step(if defined) or from
the action call.

### did
When an `on` step succeedes, a `did` step is called. Receives the result of an
`on` step as an argument.

### didNot
Basically, a `didNot` step works like a catch block, handling errors that are
thrown while the action is runnning.

```javascript
while(true) ---> will(args) ---> on(args || willResult) ---> did(onResult) ---> while(false)
                                                        |                      ^
                                                        |                      |
                                                        ---> didNot(error) -----
// Store definition
var Users = Exim.createStore({
  actions: ['eat'],
  eat: {
    while: function (eating){
      this.set('eating', eating);
    },
    will: function(ingredients) {
      return prepareFood(ingredients);
    },
    on: function (food) {
      return consume(food);
    },
    did: function (result) {
      washDishes(result);
    },
    didNot: function (error) {
      panic(error);
    }
  }
})

// Action call
Users.actions.eat(['beans', 'pepper', 'tomatoes']);
```

```coffeescript
while(true) ---> will(args) ---> on(args || willResult) ---> did(onResult) ---> while(false)
                                                        |                      ^
                                                        |                      |
                                                        ---> didNot(error) -----

# Store definition
Users = Exim.createStore
  actions: ['eat']

  eat:
    while: (eating) ->
      @set {eating}
    will: (ingredients) ->
      prepareFood(ingredients)
    on: (food) ->
      consume(food)
    did: (result) ->
      washDishes(result)
    didNot: (error) ->
      panic(error)

# Action call
Users.actions.eat(['beans', 'pepper', 'tomatoes'])
```

## Data storage

Exim has a built-in data storage for stores, that can be exposed to your
components.

### The `path` property
The `path` property is a unique identifier of the store.

### `get` and `set` methods
Use `get` and `set` methods to get or set values in store directly. `get(item)`
 returns the value stored under the `item` key. `set(item || hash, [ value ], [ options ])`
  receives the item key, its value and a set of options. For now the only opiton is
`silent`(If used, state of connected views is not being updated). Also, `set`
can receive a single hash argument of key-value pairs to update instead of
separate key and value args.

### initial values
Store initial values can be specified using `initial` property.

### global state
Exim's data storage is global. It means that the state of every store can be
accessed via a handy `Exim.stores` helper, which returns a hash with stores
paths as keys and their states as values.

### transactional state updates
Store state changes are transactional, hence it doesn't matter how many times
you call a `set` method within an action step, the state will be updated only
once. Also, `while` step state changes are being performed along with other
steps(`on` and `did`) to avoid redundand state updates.

```javascript
var userActions = Exim.createActions(['eat', 'drink'])

// the actual work happens here:
var Users = Exim.createStore({
  path: 'users',
  actions: actions,
  initial: {type: '', with: '', food: '', prefix: 'liquid'},

  eat: function(food) {
    this.set({type: 'Brunch', with: 'Chaplin', food: food});
  },
  drink: function(drink) {
    this.set({type: 'Brunch', with: 'Chaplin', food: this.get('prefix') + ' ' + drink});
  }
})

// Get value from the Users store
Users.get('type');
// Get value from the global state
Exim.stores.users.food;
```

```coffeescript
userActions = Exim.createActions(['eat', 'drink'])

Users = Exim.createStore
  path: 'users'
  actions: actions
  initial:
    type: '', with: '', food: '', prefix: 'liquid'

  eat: (food) ->
    @set type: 'Brunch', with: 'Chaplin', food: food)

  drink: (drink) ->
    @set type: 'Brunch', with: 'Chaplin', food: "#{@get('prefix')} #{drink}"

# Get value from the Users store
Users.get('type')
# Get value from the global state
Exim.stores.users.food
```

# Components

Simple React components.

To simplify reacting to store updates, Exim exposes a helper,
`Exim.connect(store([values]))`, which returns a mixin needed to re-render on store updates.
Moreover, there is a `listen` helper, which works like a `connect` one, but has
more pleasant synthax. (Note that in order to use a `listen` helper, every store you
subscribe to should have a `path` property defined)

(Exim also exposes DOM helpers for writing JSX-free CoffeeScript components. Check out the CoffeeScript tab.)

```javascript
var userActions = Exim.createActions(['eat', 'drink'])

// the actual work happens here:
var Users = Exim.createStore({
  path: 'users'
  actions: actions,
  init: function() {
    this.set({type: '', with: '', food: ''});
  },
  eat: function(food) {
    this.set({type: 'Brunch', with: 'Chaplin', food: food});
  },
  drink: function(drink) {
    this.set({type: 'Brunch', with: 'Chaplin', food: 'liquid ' + drink});
  }
})

var UserView = Exim.createView({
  //Subscribe to Users store `type` value updates
  mixins: [Exim.connect(Users('type'))],

  // Subscribe to Users store `with` and `food` values updates
  listen: ['users/with', 'users/food'],

  render: function() {
    var s = this.state;
    return <div className="user-view">
      <h2>Eatr</h2>

      <div>Eating some {s.food} with {s.friend} over {s.type};</div>
    </div>
  }
})

userActions.eat('Omelette')
userActions.drink('Porridge')
```

```coffeescript
userActions = Exim.createActions(['eat', 'drink'])

Users = Exim.createStore
  path: 'users'
  actions: actions

  init: ->
    @set type: '', with: '', food: ''

  eat: (food) ->
    @set type: 'Brunch', with: 'Chaplin', food: food)

  drink: (drink) ->
    @set type: 'Brunch', with: 'Chaplin', food: 'liquid ' + drink

var UserView = Exim.createView
  #Subscribe to Users store `type` value updates
  mixins: [Exim.connect(Users('type'))]

  #Subscribe to Users store `with` and `food` values updates
  listen: ['users/with', 'users/food']

  render: ->
    {food, friend, type} = @state

    div className: 'user-view',
      h2 "Eatr"

      div {},
        "Eating some #{food} with #{friend} over #{type}"

userActions.eat('Omelette')
userActions.drink('Porridge')
```

# Routes

Routes allow you to map top-level components to browser URLs.

### Mount helper

You can define a `mount` helper to use string shortcuts for your routes.


``` javascript
// 1. Define your React components.
var App = ...
var TwoPane = React.createClass({
  render: function() {
    return <div className="layout">
      <Sidebar/>
        {this.props.activeRouteHandler}
      </div>
  }
)

// 2. Define your routes.
var startHistory = Exim.Router.startHistory,
    match        = Exim.Router.match

// Define mount helper
Exim.Router.mount = function(name) {
  name = name.charAt(0).toUpperCase() + name.slice(1)
  require("components/" + name + "Page")().type
};

var Routes = startHistory(
  match('app', App, {path: '/'},
    match('feedback', FeedbackPage),  // Each route handler is a React view
    match('terms', TermsPage),        // this.props.activeRouteHandler()
    match('privacy', PrivacyPage),    // is passed to each view.
    match('about'),                   // Equal to match('about', AboutPage)

    match(TwoPane,
      match('calendar', Calendar),
      MessagesRoutes  // Easy nesting!
    )
  )
)

var MessagesRoutes = match('messages', Messages,
  match('new', Compose, {path: 'new'}),
  match('conversation', Conversation, {path: ':id'})
)

// 3. Launch your app.
React.render(routes, document.body)
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

# Define mount helper
Exim.Router.mount = (name) ->
  name = name.charAt(0).toUpperCase() + name.slice(1)
  require("components/#{name}Page")().type

routes = startHistory
  match 'app', App, path: '/',
    match 'feedback', FeedbackPage  # Each route handler is a React view
    match 'terms', TermsPage        # @props.activeRouteHandler()
    match 'privacy', PrivacyPage    # is passed to each view.
    match 'about'                   # Equal to match 'about', AboutPage

    match TwoPane,
      match 'calendar', Calendar
      MessagesRoutes  # Easy nesting!

MessagesRoutes = match 'messages', Messages,
  match 'new', Compose, path: 'new'
  match 'conversation', Conversation, path: ':id'

# 3. Launch your app.
React.render(routes, document.body)
```
