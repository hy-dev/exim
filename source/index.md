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

Exim.js is a HTML5 application architecture using Facebook's React.js / Flux libraries.

Exim takes Flux's simplicity and brings it to another level. We re-engineered Facebook's lib in order to make ultra-simple and convenient framework for real-world applications.

You can discuss the project on the GitHub issues page, post questions to Ost.io forum or send tweets to @hellyeahllc

Exim is an open-source project by Hell Yeah available freely under the MIT license.

# Installation

To use Exim, get the latest release with bower.

```
bower install exim
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

## Actions

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

## Stores

Stores subscribe to, and react on, specific actions.
Usually, a store would perform an HTTP request in response to action and store the result.

To listen to specific actions, you pass an object of actions to the `listenables` property.

Then, you can define three functions for each action: `willAction`, `onAction`, and `didAction`, where `Action` is the name of action.

```javascript
var actions = Exim.createActions(['work', 'eat'])

var People = Exim.createStore({
  listenables: actions,

  willWork: function() { /* ... */ },
  onWork:   function() { /* ... */ },
  didWork:  function() { /* ... */ },
  willEat:  function() { /* ... */ },
  onEat:    function() { /* ... */ },
  didEat:   function() { /* ... */ }
})
```

```javascript
actions = Exim.createActions(['work', 'eat'])

People = Exim.createStore
  listenables: actions

  willWork: -> # some
  onWork:   -> # function
  didWork:  -> # body
  willEat:  -> # goes
  onEat:    -> # right
  didEat:   -> # here
```

## Components

Simple React components.

To simplify reacting to store updates, Exim exposes a helper, `Exim.connect(store)`, which returns a mixin needed to re-render on store updates.

(Exim also exposes DOM helpers for writing JSX-free CoffeeScript components. Check out the CoffeeScript tab.)

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
  listenables: actions

  init: ->
    @update type: '', with: '', food: ''

  onEat: (food) ->
    @update type: 'Brunch', with: 'Chaplin', food: food)

  onDrink: (drink) ->
    @update type: 'Brunch', with: 'Chaplin', food: 'liquid ' + drink

var UserView = Exim.createView
  mixins: [Exim.connect(Users)]

  render: ->
    {food, friend, type} = @state

    div className: 'user-view',
      h2 "Eatr"

      div {},
        "Eating some #{food} with #{friend} over #{type}"

userActions.eat('Omelette')
userActions.drink('Porridge')
```

## Routes

Routes allow you to map top-level components to browser URLs.

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

var Routes = startHistory(
  match('app', App, {path: '/'},
    match('feedback', FeedbackPage),  // Each route handler is a React view
    match('terms', TermsPage),        // this.props.activeRouteHandler()
    match('privacy', PrivacyPage),    // is passed to each view.

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
routes = startHistory
  match 'app', App, path: '/',
    match 'feedback', FeedbackPage  # Each route handler is a React view
    match 'terms', TermsPage        # @props.activeRouteHandler()
    match 'privacy', PrivacyPage    # is passed to each view.

    match TwoPane,
      match 'calendar', Calendar
      MessagesRoutes  # Easy nesting!

MessagesRoutes = match 'messages', Messages,
  match 'new', Compose, path: 'new'
  match 'conversation', Conversation, path: ':id'

# 3. Launch your app.
React.render(routes, document.body)
```
