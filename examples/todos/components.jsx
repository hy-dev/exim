// Renders a single Todo item in the list
// Used in TodoList
var TodoItem = React.createClass({displayName: 'TodoItem',
  propTypes: {
    label: React.PropTypes.string.isRequired,
    isComplete: React.PropTypes.bool.isRequired,
    key: React.PropTypes.number
  },
  mixins: [React.addons.LinkedStateMixin], // exposes this.linkState used in render
  getInitialState: function() {
    return {};
  },
  handleToggle: function(event) {
    actions.toggleItem(this.props.key);
  },
  handleEditStart: function(event) {
    event.preventDefault();
    // because of linkState call in render, field will get value from this.state.editValue
    this.setState({
      isEditing: true,
      editValue: this.props.label
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
      actions.editItem(this.props.key, text);
    }
    // whatever the outcome, if we left the field we're not editing anymore
    this.setState({isEditing:false});
  },
  handleDestroy: function() {
    actions.removeItem(this.props.key);
  },
  render: function() {
    var classes = React.addons.classSet({
      'completed': this.props.isComplete,
      'editing': this.state.isEditing
    });
    return (
      React.createElement("li", {className: classes},
        React.createElement("div", {className: "view"},
          React.createElement("input", {className: "toggle", type: "checkbox", checked: !!this.props.isComplete, onChange: this.handleToggle}),
          React.createElement("label", {onDoubleClick: this.handleEditStart}, this.props.label),
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
  propTypes: {
    list: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  },
  toggleAll: function(event) {
    actions.toggleAllItems(event.target.checked);
  },
  render: function() {
    var filteredList;
    switch(this.props.showing){
      case 'all':
        filteredList = this.props.list;
        break;
      case 'completed':
        filteredList = _.filter(this.props.list,function(item){ return item.isComplete; });
        break;
      case 'active':
        filteredList = _.filter(this.props.list,function(item){ return !item.isComplete; });
    }
    var classes = React.addons.classSet({
      "hidden": this.props.list.length < 1
    });
    return (
      React.createElement("section", {id: "main", className: classes},
        React.createElement("input", {id: "toggle-all", type: "checkbox", onChange: this.toggleAll}),
        React.createElement("label", {htmlFor: "toggle-all"}, "Mark all as complete"),
        React.createElement("ul", {id: "todo-list"},
           filteredList.map(function(item){return React.createElement(TodoItem, {label: item.label, isComplete: item.isComplete, key: item.key}); })
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
      actions.addItem(text);
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
    list: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  },
  render: function() {
    var completed = _.filter(this.props.list, "isComplete").length;
    var total = this.props.list.length;
    var incomplete = total - completed;
    var clearButtonClass = React.addons.classSet({hidden: completed < 1});
    var footerClass = React.addons.classSet({hidden: !total });
    var completedLabel = "Clear completed (" + completed + ")";
    var itemsLeftLabel = incomplete === 1 ? " item left" : " items left";
    return (
      React.createElement("footer", {id: "footer", className: footerClass},
        React.createElement("span", {id: "todo-count"}, React.createElement("strong", null, incomplete), itemsLeftLabel),
        React.createElement("ul", {id: "filters"},
          React.createElement("li", null,
            React.createElement(Link, {activeClassName: "selected", to: "All"}, "All")
          ),
          React.createElement("li", null,
            React.createElement(Link, {activeClassName: "selected", to: "Active"}, "Active")
          ),
          React.createElement("li", null,
            React.createElement(Link, {activeClassName: "selected", to: "Completed"}, "Completed")
          )
        ),
        React.createElement("button", {id: "clear-completed", className: clearButtonClass, onClick: actions.clearCompleted}, completedLabel)
      )
    );
  }
});

// Renders the full application
// activeRouteHandler will always be TodoMain, but with different 'showing' prop (all/completed/active)
var TodoApp = React.createClass({displayName: 'TodoApp',
  // this will cause setState({list:updatedlist}) whenever the store does trigger(updatedlist)
  mixins: [Exim.connect(TodoStore,"list")],
  getInitialState: function() {
    return {
      list: []
    };
  },
  render: function() {
    return (
      React.createElement("div", null,
        React.createElement(TodoHeader, null),
        React.createElement(RouteHandler, {list: this.state.list}),
        React.createElement(TodoFooter, {list: this.state.list})
      )
    );
  }
});

var routes = (
  React.createElement(Exim.Routes, {location: "hash"},
    React.createElement(Exim.Route, {handler: TodoApp},
      React.createElement(Exim.Route, {name: "All", path: "/", handler: TodoMain, showing: "all"}),
      React.createElement(Exim.Route, {name: "Completed", path: "/completed", handler: TodoMain, showing: "completed"}),
      React.createElement(Exim.Route, {name: "Active", path: "/active", handler: TodoMain, showing: "active"})
    )
  )
);

Router.run(routes, function (Handler) {
  React.render(React.createElement(Handler, null), document.querySelector('#todoapp'));
});
