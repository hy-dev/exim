OUTPUT ?= toothpaste.js

toothpaste:
	cat lib/{header,utils,Action,Constants,Dispatcher,Store,Fluxy,footer}.js > $(OUTPUT)
