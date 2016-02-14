DISTDIR=HTDOCS
EDITOR=editor
GO=go run
COMPILE_PIPE=| $(GO) bin/jscompilepipe.go 
GENDIR=$(DISTDIR)/gen

all: DIST EXAMPLE

DIST: $(GENDIR)/globe.js $(DISTDIR)/third-party

EXAMPLE: DIST $(DISTDIR)/img
	mkdir -p $(DISTDIR)/examples
	for e in `ls -1 example/ | xargs`; do make -C example/$$e DIST; mkdir -p $(DISTDIR)/examples/$$e;  cp -r example/$$e/DIST/* $(DISTDIR)/examples/$$e/; done;
	for e in `ls -1 example/ | xargs`; do cp -r $(DISTDIR)/img $(DISTDIR)/examples/$$e/htdocs/; done;
	for e in `ls -1 example/ | xargs`; do cp -r $(DISTDIR)/third-party/* $(DISTDIR)/examples/$$e/htdocs/third-party/; done;
	for e in `ls -1 example/ | xargs`; do cp -r $(GENDIR) $(DISTDIR)/examples/$$e/htdocs/gen; done;

$(DISTDIR)/third-party: $(DISTDIR)
	cp -r third-party $@

$(GENDIR)/lookup.js: $(GENDIR)
	bin/create_lookupmap.pl $@ 

$(DISTDIR):
	mkdir -p $@
	
$(DISTDIR)/img:
	mkdir -p $@
	cp -r img/* $@

$(GENDIR): $(DISTDIR)
	mkdir -p $@

$(GENDIR)/flags.css: $(GENDIR)/flagatlas.png

atlas: $(GENDIR)/atlas.png

flagatlas: $(GENDIR)/flagatlas.png

$(GENDIR)/atlas.png:
	bin/create_atlas.pl $@ img/cmap.png

$(GENDIR)/flagatlas.png: $(GENDIR)
	rm $(GENDIR)/flagatlas.png $(GENDIR)/flags.css || true
	$(GO) bin/flagatlas.go atlas/flags countrydata/country_map.json $@ $(GENDIR)/flags.css flagatlas.png

$(DISTDIR)/img/cmap.png: $(DISTDIR)/img img/cmap.png
	cp img/map.png $@

$(GENDIR)/globe.js: $(GENDIR)/lookup.js $(GENDIR)/flags.css $(GENDIR)/atlas.png $(GENDIR)/flagatlas.png globe.js namespace.js
	#cat namespace.js $(GENDIR)/lookup.js globe.js $(COMPILE_PIPE) > $@
	cat namespace.js $(GENDIR)/lookup.js globe.js > $@
	rm $(GENDIR)/lookup.js

test: EXAMPLE
	cd $(DISTDIR)/examples/basic && go run server.go


check: 
	jshint *.js

edit: 
	$(EDITOR) *.js Makefile example/twitter/*.go example/twitter/htdocs/index.html

clean:
	rm -rf $(DISTDIR)/img $(DISTDIR)/examples $(GENDIR)/globe.js $(GENDIR)/flagatlas.png $(GENDIR)/flags.css $(DISTDIR)/third-party
	for e in `ls -1 example/ | xargs`; do make -C example/$$e clean; done;

fullclean: clean
	rm -rf $(DISTDIR)
