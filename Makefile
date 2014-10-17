OUTPUT ?= toothpaste.js

toothpaste:
	cat lib/{header,utils,ajax,Router,Action,Constants,Dispatcher,Store,Fluxy,footer}.js > $(OUTPUT)

test:
	phantomjs test/vendor/runner.js test/index.html?noglobals=true

.PHONY: test
