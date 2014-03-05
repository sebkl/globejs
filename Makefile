DISTDIR=HTDOCS
EDITOR=editor

all: DIST EXAMPLE

DIST: $(DISTDIR)/globe.js $(DISTDIR)/third-party

EXAMPLE: DIST
	mkdir -p $(DISTDIR)/examples
	cp -r example/* $(DISTDIR)/examples/
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
	bin/create_atlas.pl $@ 

$(DISTDIR)/img/atlas.png: $(DISTDIR)/img img/atlas.png
	cp img/atlas.png $@

$(DISTDIR)/globe.js: $(DISTDIR)/lookup.js $(DISTDIR)/img/atlas.png
	cat namespace.js $(DISTDIR)/lookup.js globe.js > $@
	#rm $(DISTDIR)/lookup.js

test: EXAMPLE
	cd $(DISTDIR)/examples/openflights && go run server.go

edit: 
	$(EDITOR) *.js Makefile example/openflights/server.go example/openflights/htdocs/index.html



clean:
	rm -rf $(DISTDIR)
