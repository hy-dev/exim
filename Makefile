OUTPUT ?= toothpaste.js

toothpaste:
	cat lib/{header,utils,ajax,Action,Constants,Dispatcher,Store,Fluxy,footer}.js > $(OUTPUT)
