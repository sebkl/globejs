EDITOR=gvim

all: twitter

twitter: 
	go build

build: twitter

edit: 
	$(EDITOR) *.go htdocs/index.html

clean:
	rm -rf twitter twitter.test DIST

DIST: twitter
	mkdir -p DIST
	cp -rf htdocs DIST
	cp -rf twitter DIST
	cp -rf *json* DIST

	


