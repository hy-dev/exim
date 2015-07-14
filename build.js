var fs = require("fs");
var browserify = require("browserify");
var babelify = require("babelify");
var bro = browserify({ debug: true, cache: {}, packageCache: {}, standalone: 'Exim'});

function update () {
  bro
    .transform(babelify)
	.transform('exposify', {
		expose:{
			'react':'React',
			'react-router':'ReactRouter'
		}
	})
    .require("./src", { entry: true })
    .bundle()
    .on("error", function (err) { console.log("Error : " + err.message); })
    .pipe(fs.createWriteStream("./dist/exim.js"));
}

update();

