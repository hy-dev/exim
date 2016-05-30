const fs   = require("fs"),
browserify = require("browserify");

browserify({ 
	debug: false, 
	cache: {}, 
	packageCache: {}, 
	standalone: 'Exim' 
})
  .transform("babelify")
  .require("./src", { entry: true })
  .bundle()
  .on("error", err => console.log("Error : " + err.message) )
  .pipe(fs.createWriteStream("./exim.js"));
