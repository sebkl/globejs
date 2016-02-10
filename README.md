globejs
=======

web-gl based globe application inspired by the web-gl globe of the google arts team.

## Requirements
Currently [google chrome](http://www.google.com/chrome), [firefox](http://www.mozilla.org/firefox/) as well
as [safari](https://www.apple.com/safari/) browsers are supported.

The build process, which generates textures and javascript index files, requires a running [golang](http://golang.org) and perl environment with a working [Perl Image::Magick](http://www.imagemagick.org/) module. 

## External content and references.
This globe was inspired by [dataarts/webgl-globe](https://github.com/dataarts/webgl-globe) 
and makes heavy use of the [Three.js](https://github.com/mrdoob/three.js/) and [Tween.js](https://github.com/sole/tween.js) libraries.
Country flag images are fetched from [geognos api](http://www.geognos.com).

## Features
- country hovering
- country heatmap
- particle system based on geo coordinates (lat/long)
- data pillars based on geo coordinates (lat/long,country)
- connections based on geo coordinates (lat/long,country)

## Examples

Currently a few sample applications are part of the repo. Please also review the **requirements** section for build process requirements.

In order to start an example please follow the following instructions:

### Step 1) Build textures and generate javascript index files.
The build process could take some time because the textures are currently generated in a very inefficient way. Feel free to improve this by submitting a pull request ;)

```
% make
```

### Step 2) Install required go packages:

To run the examples make sure that the corresponding golang packages are installed:
```
% go get github.com/sebkl/gotojs
% go get github.com/sebkl/gopenflights
```

### Step 3) Run the example server application:
*Basic example:*

```
% cd HTDOCS/examples/basic && go run server.go
2016/02/10 21:10:34 Registering converter for type string
2016/02/10 21:10:34 Registering converter for type time.Time
2016/02/10 21:10:34 FileServer enabled at '/p'
2016/02/10 21:10:34 GotojsEngine enabled at '/gotojs/'
2016/02/10 21:10:34 Starting server at ":8080".
```


*Openflights example:*

```
% cd HTDOCS/examples/basic && go run server.go
...
```

*Twitter example:*

```
% cd HTDOCS/examples/twitter/
% cp witter_account.json.sample twitter_account.json
% vim HTDOCS/examples/twitter/twitter_account.json
% # Adjust your twitter account details to initiate a tweet stream.
% ./twitter
...
```

### Step 4) Open the browser
Open your browser and browser the page [localhost:8080](http://localhost:8080).

![screenshot](https://raw.github.com/sebkl/globejs/master/screenshots/sample_plain.png)
![screenshot](https://raw.github.com/sebkl/globejs/master/screenshots/sample_openflights.png)
![screenshot](https://raw.github.com/sebkl/globejs/master/screenshots/sample.png)    
