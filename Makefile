DISTDIR=HTDOCS
EDITOR=editor
VIEWER=open
GO=go
COMPILE_PIPE=| $(GO) bin/jscompilepipe.go 
GENDIR=$(DISTDIR)/gen
DEPENDENCIES = $(shell egrep -r -o -e "\"(github.com|code.google.com)/.+\"" . | cut -d ":" -f2 | sort -u)

all: DIST EXAMPLE

.PHONY: godeps
godeps:
	$(GO) get -u $(DEPENDENCIES)

.PHONY: DIST
DIST: $(GENDIR)/globe.js $(DISTDIR)/third-party

.PHONY: EXAMPLE
EXAMPLE: DIST $(DISTDIR)/img
	mkdir -p $(DISTDIR)/examples
	for e in `ls -1 example/ | xargs`; do make -C example/$$e DIST; mkdir -p $(DISTDIR)/examples/$$e;  cp -r example/$$e/DIST/* $(DISTDIR)/examples/$$e/; done;
	for e in `ls -1 example/ | xargs`; do cp -r $(DISTDIR)/img $(DISTDIR)/examples/$$e/htdocs/; done;
	for e in `ls -1 example/ | xargs`; do cp -r $(DISTDIR)/third-party/* $(DISTDIR)/examples/$$e/htdocs/third-party/; done;
	for e in `ls -1 example/ | xargs`; do cp -r $(GENDIR) $(DISTDIR)/examples/$$e/htdocs/gen; done;

$(DISTDIR)/third-party: $(DISTDIR)
	cp -r third-party $@

$(GENDIR)/lookup.js: $(GENDIR)
	$(GO) run  bin/lookupmap.go $@

$(DISTDIR):
	mkdir -p $@
	
$(DISTDIR)/img:
	mkdir -p $@
	cp -r img/* $@

$(GENDIR): $(DISTDIR)
	mkdir -p $@

$(GENDIR)/flags.css: $(GENDIR)/flagatlas.png

.PHONY: atlas
atlas: $(GENDIR)/atlas.png $(GENDIR)/cmap.png

.PHONY: flagatlas
flagatlas: $(GENDIR)/flagatlas.png

$(GENDIR)/atlas.png:
	$(GO) run bin/textureatlas.go atlas.json $@ 
	
$(GENDIR)/cmap.png:
	$(GO) run bin/textureatlas.go cmap.json $@ 

$(GENDIR)/flagatlas.png: $(GENDIR)
	rm $(GENDIR)/flagatlas.png $(GENDIR)/flags.css || true
	$(GO) run bin/flagatlas.go atlas/flags countrydata/country_map.json $@ $(GENDIR)/flags.css flagatlas.png

$(DISTDIR)/img/cmap.png: $(DISTDIR)/img img/cmap.png
	cp img/map.png $@

$(GENDIR)/globe.js: $(GENDIR)/lookup.js $(GENDIR)/flags.css $(GENDIR)/atlas.png $(GENDIR)/cmap.png  $(GENDIR)/flagatlas.png globe.js namespace.js
	#cat namespace.js $(GENDIR)/lookup.js globe.js $(COMPILE_PIPE) > $@
	cat namespace.js $(GENDIR)/lookup.js globe.js > $@
	rm $(GENDIR)/lookup.js

.PHONY: check
test: EXAMPLE
	cd $(DISTDIR)/examples/basic && go run server.go

.PHONY: check
check: 
	jshint *.js

.PHONY: edit
edit: 
	$(EDITOR) *.js Makefile example/twitter/*.go example/twitter/htdocs/index.html

.PHONY: clean
clean:
	rm -rf $(DISTDIR)/img $(DISTDIR)/examples $(GENDIR)/globe.js $(GENDIR)/flagatlas.png $(GENDIR)/flags.css $(DISTDIR)/third-party
	for e in `ls -1 example/ | xargs`; do make -C example/$$e clean; done;

.PHONY: fullclean
fullclean: clean
	rm -rf $(DISTDIR)
