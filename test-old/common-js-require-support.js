//run common-js-require-support.js and expect no errors
var Exim = require('../exim')
Exim.createView({
  render:function() {
    console.log("hi")
  }
})
