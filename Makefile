min:
	@uglifyjs -m < dist/exim.js > dist/exim.min.js
	@echo 'Default:    ' `cat dist/exim.js | wc -l` LOC, `cat dist/exim.js | wc -c` bytes
	@echo 'Gzipped:    ' `gzip -9 < dist/exim.js | wc -c` bytes
	@echo 'Min-gzipped:' `gzip -9 < dist/exim.min.js | wc -c` bytes

test:
	phantomjs test/vendor/runner.js test/index.html?noglobals=true

.PHONY: test
