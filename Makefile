OUTPUT ?= exim.js

exim:
	cat src/{header,eventEmitter,utils,joins,Router,ListenerMethods,PublisherMethods,createAction,createStore,Keep,connect,ListenerMixin,listenTo,listenToMany,index,Exim,footer}.js > $(OUTPUT)

exim_old:
	cat lib/{header,utils,Router,Action,Dispatcher,Store,Listener,Exim,footer}.js > $(OUTPUT)

test:
	phantomjs test/vendor/runner.js test/index.html?noglobals=true

.PHONY: test
