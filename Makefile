min:
	@uglifyjs -m < exim.js > exim.min.js
	@echo 'Default:    ' `cat exim.js | wc -l` LOC, `cat exim.js | wc -c` bytes
	@echo 'Gzipped:    ' `gzip -9 < exim.js | wc -c` bytes
	@echo 'Min-gzipped:' `gzip -9 < exim.min.js | wc -c` bytes

test:
	phantomjs test/vendor/runner.js test/index.html?noglobals=true

.PHONY: test
