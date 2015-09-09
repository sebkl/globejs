DISTDIR=HTDOCS
EDITOR=editor
GO=go run
COMPILE_PIPE=| $(GO) bin/jscompilepipe.go 

all: DIST EXAMPLE

DIST: $(DISTDIR)/globe.js $(DISTDIR)/third-party

EXAMPLE: DIST
	mkdir -p $(DISTDIR)/examples
	for e in `ls -1 example/ | xargs`; do make -C example/$$e DIST; mkdir -p $(DISTDIR)/examples/$$e;  cp -r example/$$e/DIST/* $(DISTDIR)/examples/$$e/; done;
	for e in `ls -1 example/ | xargs`; do cp -r $(DISTDIR)/img $(DISTDIR)/examples/$$e/htdocs/; done;
	for e in `ls -1 example/ | xargs`; do cp -r $(DISTDIR)/third-party/* $(DISTDIR)/examples/$$e/htdocs/third-party/; done;
	for e in `ls -1 example/ | xargs`; do cp -r $(DISTDIR)/*.js $(DISTDIR)/examples/$$e/htdocs/; done;
	for e in `ls -1 example/ | xargs`; do cp -r $(DISTDIR)/*.css $(DISTDIR)/examples/$$e/htdocs/; done;

$(DISTDIR)/third-party: $(DISTDIR)
	cp -r third-party $@

$(DISTDIR)/lookup.js: $(DISTDIR)
	bin/create_lookupmap.pl $@ 

$(DISTDIR):
	mkdir -p $@

$(DISTDIR)/img: $(DISTDIR)
	mkdir -p $@
	cp -r img/* $@/

$(DISTDIR)/img/flags: $(DISTDIR)
	cp -r atlas/flags $@

$(DISTDIR)/flags.css: img/flagatlas.png

atlas: img/atlas.png

flagatlas: img/flagatlas.png

img/atlas.png:
	bin/create_atlas.pl $@ img/cmap.png

img/flagatlas.png:
	$(GO) bin/flagatlas.go atlas/flags countrydata/country_map.json $@ $(DISTDIR)/flags.css

$(DISTDIR)/img/atlas.png: $(DISTDIR)/img img/atlas.png
	cp img/atlas.png $@

$(DISTDIR)/img/flagatlas.png: $(DISTDIR)/img img/flagatlas.png
	cp img/flagatlas.png $@

$(DISTDIR)/img/cmap.png: $(DISTDIR)/img img/cmap.png
	cp img/map.png $@

$(DISTDIR)/globe.js: $(DISTDIR)/lookup.js $(DISTDIR)/flags.css $(DISTDIR)/img/atlas.png $(DISTDIR)/img/flags $(DISTDIR)/img/flagatlas.png globe.js namespace.js
	#cat namespace.js $(DISTDIR)/lookup.js globe.js $(COMPILE_PIPE) > $@
	cat namespace.js $(DISTDIR)/lookup.js globe.js > $@
	#rm $(DISTDIR)/lookup.js

test: EXAMPLE
	cd $(DISTDIR)/examples/basic && go run server.go

edit: 
	$(EDITOR) *.js Makefile example/twitter/*.go example/twitter/htdocs/index.html

clean:
	rm -rf $(DISTDIR)/examples $(DISTDIR)/globe.js $(DISTDIR)/flags.css
	rm -f img/flagatlas.png
	for e in `ls -1 example/ | xargs`; do make -C example/$$e clean; done;

fullclean: clean
	rm -rf $(DISTDIR)
