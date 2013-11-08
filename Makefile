DISTDIR=HTDOCS

all: DIST EXAMPLE

DIST: $(DISTDIR)/globe.js $(DISTDIR)/third-party

EXAMPLE::
	cp -r example/* $(DISTDIR)


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


img/atlas.png:
	bin/create_atlas.pl $@ 

$(DISTDIR)/img/atlas.png: $(DISTDIR)/img img/atlas.png
	cp img/atlas.png $@

$(DISTDIR)/globe.js: $(DISTDIR)/lookup.js $(DISTDIR)/img/atlas.png
	cat namespace.js $(DISTDIR)/lookup.js globe.js > $@
	rm $(DISTDIR)/lookup.js

clean:
	rm -rf $(DISTDIR)
