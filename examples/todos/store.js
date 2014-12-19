var Link = Exim.Link;

var getRandomId = function() {
  return (Date.now() + Math.floor(Math.random() * 999999)).toString(36);
};

var textIsNotEmpty = function(text) {
  return text.trim() !== '';
};

var actions = Exim.createActions([
  'create',
  'updateText',
  'toggleComplete',
  'toggleCompleteAll',
  'destroy',
  'destroyCompleted'
]);

var TodoStore = Exim.createStore({
  actions: actions,
  privateMethods: ['updateTodo', 'updateAll'],

  getInitial: function() {
    return {todos: {}}
  },

  updateTodo: function(id, updates) {
    var todos = this.get('todos');
    assign(todos[id], updates);
    this.update({todos: todos});
  },

  updateAll: function(updates) {
    var todos = this.get('todos');
    for (var id in todos) {
      this.updateTodo(id, updates);
    }
    this.update({todos: todos});
  },

  // Public methods.
  areAllComplete: function() {
    for (var id in _todos) {
      if (!_todos[id].complete) {
        return false;
      }
    }
    return true;
  },

  // Actions.
  create: {
    will: textIsNotEmpty,

    on: function(text) {
      var id = getRandomId();
      _todos[id] = {id: id, complete: false, text: text.trim()};
    }
  },

  updateText: {
    pre: function(id, text) {
      return [id, text.trim()];
    },

    should: function(id, text) {
      return text && id > 0;
    },

    on: function(id, text) {
      this.updateTodo(id, {text: text})
    }
  },

  toggleComplete: function(id) {
    var todo = this.get('todos')[id];
    this.updateTodo(id, {complete: !todo.complete})
  },

  toggleCompleteAll: function() {
    var complete = !this.areAllComplete();
    this.updateAll({complete: complete})
  },

  destroy: function(id) {
    delete this.get('todos')[id];
  },

  destroyCompleted: function() {
    var todos = this.get('todos');
    for (var id in todos) {
      if (!todos[id].complete) {
        delete todos[id];
      }
    }
  }
});
