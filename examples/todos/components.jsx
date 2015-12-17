// Renders a single Todo item in the list
// Used in TodoList
var TodoItem = React.createClass({displayName: 'TodoItem',
  propTypes: {
    text: React.PropTypes.string.isRequired,
    complete: React.PropTypes.bool.isRequired,
    id: React.PropTypes.string
  },
  mixins: [React.addons.LinkedStateMixin], // exposes this.linkState used in render
  getInitialState: function() {
    return {};
  },
  handleToggle: function(event) {
    TodoStore.actions.toggleComplete(this.props.id);
  },
  handleEditStart: function(event) {
    event.preventDefault();
    // because of linkState call in render, field will get value from this.state.editValue
    this.setState({
      isEditing: true,
      editValue: this.props.text
    }, function() {
      this.refs.editInput.getDOMNode().focus();
    });
  },
  handleValueChange: function(event) {
    var text = this.state.editValue; // because of the linkState call in render, this is the contents of the field
    // we pressed enter, if text isn't empty we blur the field which will cause a save
    if (event.which === 13 && text) {
      this.refs.editInput.getDOMNode().blur();
    }
    // pressed escape. set editing to false before blurring so we won't save
    else if (event.which === 27) {
      this.setState({ isEditing: false },function(){
        this.refs.editInput.getDOMNode().blur();
      });
    }
  },
  handleBlur: function() {
    var text = this.state.editValue; // because of the linkState call in render, this is the contents of the field
    // unless we're not editing (escape was pressed) or text is empty, save!
    if (this.state.isEditing && text) {
      TodoStore.actions.editItem(this.props.id, text);
    }
    // whatever the outcome, if we left the field we're not editing anymore
    this.setState({isEditing:false});
  },
  handleDestroy: function() {
    TodoStore.actions.destroy(this.props.id);
  },
  render: function() {
    var classes = Exim.helpers.cx({
      'completed': this.props.complete,
      'editing': this.state.isEditing
    });
    return (
      React.createElement("li", {className: classes},
        React.createElement("div", {className: "view"},
          React.createElement("input", {className: "toggle", type: "checkbox", checked: !!this.props.complete, onChange: this.handleToggle}),
          React.createElement("label", {onDoubleClick: this.handleEditStart}, this.props.text),
          React.createElement("button", {className: "destroy", onClick: this.handleDestroy})
        ),
        React.createElement("input", {ref: "editInput", className: "edit", valueLink: this.linkState('editValue'), onKeyUp: this.handleValueChange, onBlur: this.handleBlur})
      )
    );
  }
});

// Renders the todo list as well as the toggle all button
// Used in TodoApp
var TodoMain = React.createClass({displayName: 'TodoMain',
  mixins: [Exim.Router.State],
  propTypes: {
    todos: React.PropTypes.object.isRequired,
  },
  toggleAll: function(event) {
    TodoStore.actions.toggleCompleteAll(event.target.checked);
  },
  render: function() {
    var todos = this.props.todos;
    var list = [], filteredList = [];
    for(var item in todos) {
      list.push(todos[item]);
    }

    if(this.isActive('all'))
      filteredList = list;
    if(this.isActive('completed'))
      filteredList = _.filter(list,function(item){ return item.complete; });
    if(this.isActive('active'))
      filteredList = _.filter(list,function(item){ return !item.complete; });
    var classes = Exim.helpers.cx({
      "hidden": list.length < 1
    });
    return (
      React.createElement("section", {id: "main", className: classes},
        React.createElement("input", {id: "toggle-all", type: "checkbox", onChange: this.toggleAll}),
        React.createElement("label", {htmlFor: "toggle-all"}, "Mark all as complete"),
        React.createElement("ul", {id: "todo-list"},
           filteredList.map(function(item){return React.createElement(TodoItem, {text: item.text, complete: item.complete, id: item.id}); })
        )
      )
    );
  }
});

// Renders the headline and the form for creating new todos.
// Used in TodoApp
// Observe that the toogleall button is NOT rendered here, but in TodoMain (it is then moved up to the header with CSS)
var TodoHeader = React.createClass({displayName: 'TodoHeader',
  handleValueChange: function(event) {
    var text = event.target.value;
    if (event.which === 13 && text) { // hit enter, create new item if field isn't empty
      TodoStore.actions.create(text);
      event.target.value = '';
    } else if (event.which === 27) { // hit escape, clear without creating
      event.target.value = '';
    }
  },
  render: function() {
    return (
      React.createElement("header", {id: "header"},
        React.createElement("h1", null, "todos"),
        React.createElement("input", {id: "new-todo", placeholder: "What needs to be done?", autoFocus: true, onKeyUp: this.handleValueChange})
      )
    );
  }
});

// Renders the bottom item count, navigation bar and clearallcompleted button
// Used in TodoApp
var TodoFooter = React.createClass({displayName: 'TodoFooter',
  propTypes: {
    todos: React.PropTypes.object.isRequired,
  },
  render: function() {
    var Link = Exim.Router.Link;
    var todos = this.props.todos
    var completed = [];
    for (var id in todos) {
      if (todos[id].complete) {
        completed.push(todos[id]);
      }
    }
    completed = completed.length;
    var total = Object.keys(todos).length;
    var incomplete = total - completed;
    var clearButtonClass = Exim.helpers.cx({hidden: completed < 1});
    var footerClass = Exim.helpers.cx({hidden: !total });
    var completedLabel = "Clear completed (" + completed + ")";
    var itemsLeftLabel = incomplete === 1 ? " item left" : " items left";
    return (
      React.createElement("footer", {id: "footer", className: footerClass},
        React.createElement("span", {id: "todo-count"}, React.createElement("strong", null, incomplete), itemsLeftLabel),
        React.createElement("ul", {id: "filters"},
          React.createElement("li", null,
            Link({activeClassName: "selected", to: "all"}, "All")
          ),
          React.createElement("li", null,
            Link({activeClassName: "selected", to: "active"}, "Active")
          ),
          React.createElement("li", null,
            Link({activeClassName: "selected", to: "completed"}, "Completed")
          )
        ),
        React.createElement("button", {id: "clear-completed", className: clearButtonClass, onClick: TodoStore.actions.destroyCompleted}, completedLabel)
      )
    );
  }
});

// Renders the full application
var TodoApp = React.createClass({displayName: 'TodoApp',
  mixins: [TodoStore.connect("todos")],
  render: function() {
    return (
      React.createElement("div", null,
        React.createElement(TodoHeader, null),
        Exim.Router.RouteHandler({todos: this.state.todos}),
        React.createElement(TodoFooter, {todos: this.state.todos})
      )
    );
  }
});

var match = Exim.Router.match, Route = Exim.Router.Route;

var routes = (
  Route({handler: TodoApp},
    match("all", TodoMain, {path: "/"}),
    match("completed", TodoMain, {path: "/completed"}),
    match("active", TodoMain, {path: "/active"})
  )
);

ReactRouter.run(routes, function (Handler) {
  React.render(React.createElement(Handler, null), document.querySelector('#todoapp'));
});
