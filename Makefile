OUTPUT ?= exim.js

exim:
	cat lib/{header,utils,Router,Action,Constants,Dispatcher,Store,Listener,Exim,footer}.js > $(OUTPUT)

test:
	phantomjs test/vendor/runner.js test/index.html?noglobals=true

.PHONY: test
