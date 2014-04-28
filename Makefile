DISTDIR=HTDOCS
EDITOR=editor

all: DIST EXAMPLE

DIST: $(DISTDIR)/globe.js $(DISTDIR)/third-party

EXAMPLE: DIST
	mkdir -p $(DISTDIR)/examples
	for e in `ls -1 example/ | xargs`; do make -C example/$$e DIST; mkdir -p $(DISTDIR)/examples/$$e;  cp -r example/$$e/DIST/* $(DISTDIR)/examples/$$e/; done;
	for e in `ls -1 example/ | xargs`; do cp -r $(DISTDIR)/img $(DISTDIR)/examples/$$e/htdocs/; done;
	for e in `ls -1 example/ | xargs`; do cp -r $(DISTDIR)/third-party/* $(DISTDIR)/examples/$$e/htdocs/third-party/; done;
	for e in `ls -1 example/ | xargs`; do cp -r $(DISTDIR)/globe.js $(DISTDIR)/examples/$$e/htdocs/; done;


$(DISTDIR)/third-party:
	cp -r third-party $@

$(DISTDIR)/lookup.js: $(DISTDIR)/img/flags
	bin/create_lookupmap.pl $@ $(DISTDIR)/img/flags

$(DISTDIR):
	mkdir -p $@

$(DISTDIR)/img: $(DISTDIR)
	mkdir -p $@
	cp -r img/* $@/

$(DISTDIR)/img/flags: $(DISTDIR)/img
	mkdir -p $@

atlas: img/atlas.png

img/atlas.png:
	bin/create_atlas.pl $@ img/cmap.png

$(DISTDIR)/img/atlas.png: $(DISTDIR)/img img/atlas.png
	cp img/atlas.png $@

$(DISTDIR)/img/cmap.png: $(DISTDIR)/img img/cmap.png
	cp img/map.png $@

$(DISTDIR)/globe.js: $(DISTDIR)/lookup.js $(DISTDIR)/img/atlas.png globe.js namespace.js
	cat namespace.js $(DISTDIR)/lookup.js globe.js > $@
	#rm $(DISTDIR)/lookup.js

test: EXAMPLE
	cd $(DISTDIR)/examples/openflights && go run server.go

edit: 
	$(EDITOR) *.js Makefile example/twitter/*.go example/twitter/htdocs/index.html



clean:
	rm -rf $(DISTDIR)
	for e in `ls -1 example/ | xargs`; do make -C example/$$e clean; done;
