var ThreadSection  = require("./ThreadSection");
var MessageSection = require("./MessageSection");
var RouteHandler   = ReactRouter.RouteHandler;

App = React.createClass({
  render: function () {
    return (
      <div className="chatapp">
        <ThreadSection/>
        <RouteHandler/>
      </div>
    )
  }
})

module.exports = App
