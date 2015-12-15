var Link = Exim.Link;

var getRandomId = function() {
  return (Date.now() + Math.floor(Math.random() * 999999)).toString(36);
};

var textIsEmpty = function(text) {
  return text.trim() === '';
};


var areAllComplete = function(todos) {
  for (var id in todos) {
    if (!todos[id].complete) {
      return false;
    }
  }
  return true;
};

var TodoStore = Exim.createStore({
  actions: [
    'create',
    'updateText',
    'toggleComplete',
    'toggleCompleteAll',
    'destroy',
    'destroyCompleted',
    'updateTodo',
    'updateAll'
  ],

  initial: {
    todos: {}
  },

  updateTodo: function(id, updates) {
    var todos = this.get('todos');
    for(var update in updates) {
      todos[id][update] = updates[update];
    }
    this.set({todos: todos});
  },

  updateAll: function(updates) {
    var todos = this.get('todos');
    for (var id in todos) {
      this.actions.updateTodo(id, updates);
    }
    this.set({todos: todos});
  },

  create: function(text) {
    if(textIsEmpty(text))
      return false;

    var todos = this.get('todos');
    var id = getRandomId();
    todos[id] = {id: id, complete: false, text: text.trim()};
    this.set('todos', todos);
  },

  updateText: {
    will: function(id, text) {
      return [id, text.trim()];
    },
    on: function(id, text) {
      if(text && id > 0)
        this.actions.updateTodo(id, {text: text})
    }
  },

  toggleComplete: function(id) {
    var todo = this.get('todos')[id];
    this.actions.updateTodo(id, {complete: !todo.complete})
  },

  toggleCompleteAll: function() {
    var complete = !areAllComplete(this.get('todos'));
    this.actions.updateAll({complete: complete})
  },

  destroy: function(id) {
    var todos = this.get('todos')
    delete todos[id];
    this.set('todos', todos);
  },

  destroyCompleted: function() {
    var todos = this.get('todos');
    for (var id in todos) {
      if (todos[id].complete) {
        delete todos[id];
      }
    }
    this.set('todos', todos);
  }
});
