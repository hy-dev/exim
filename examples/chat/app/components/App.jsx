var ThreadSection  = require("./ThreadSection");
var MessageSection = require("./MessageSection");
var RouteHandler   = Exim.Router.RouteHandler;

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
