var fs = require("fs");
var browserify = require("browserify");
var watchify = require("watchify");
var babelify = require("babelify");
var bro = browserify({ debug: false, cache: {}, packageCache: {}})
function update () {
  bro
    .transform(babelify)
    .require("./src", { entry: true })
    .bundle()
    .on("error", function (err) { console.log("Error : " + err.message); })
    .pipe(fs.createWriteStream("./exim.js"))
};
update();

// watchify({cache: {}}).on('update', update);

