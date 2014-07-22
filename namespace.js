/* Namespace to be used: GLOBE */

/* Initializations */
var GLOBE = GLOBE || {
	'CONFIGURATION': {
		'browsers': {
			'Firefox': {
				'version': 33,
				'url': "http://www.mozilla.org/firefox/",
				'icon': "https://raw.github.com/alrra/browser-logos/master/firefox/firefox_128x128.png"
			},
			'Chrome': {
				'version': 27,
				'url': "http://www.google.com/chrome/",
				'icon': "https://raw.github.com/alrra/browser-logos/master/chrome/chrome_128x128.png"
			},
			'Safari': {
				'version' : 6,
				'url': "https://www.apple.com/safari/",
				'icon': "https://raw.github.com/alrra/browser-logos/master/safari/safari_128x128.png"
			}
		},
		'shareButtons': {
			'Facebook': {
				url:'https://www.facebook.com/sharer/sharer.php?u=' + $(location).attr('href'),
				icon: 'img/third-party/fbicon.png'

			},
			'Twitter': {
				url: "http://twitter.com/share?url=" + $(location).attr('href'),
				icon: 'img/third-party/twicon.png'
			},
			'Google+ share': {
				url: "https://plus.google.com/share?url="+ $(location).attr('href'),
				icon: 'img/third-party/gpicon.png'
			},
			'Google +1': {
				item: '<div class="g-plusone" data-size="standard" data-annotation="none"></div><script>(function() { var po = document.createElement("script"); po.type = "text/javascript"; po.async = true; po.src = "https://apis.google.com/js/platform.js"; var s = document.getElementsByTagName("script")[0]; s.parentNode.insertBefore(po, s); })();</script>'
			}
		}
	},
	'HELPER': {
		'dayOfYear': function(d) {
			var first = new Date(d.getFullYear(), 0, 1);
			var theDay = Math.round(((d - first) / 1000 / 60 / 60 / 24) + .5, 0);
			return d;
		},
		'assertSupportedBrowsers': function() {
			var found = 0;
			var ua = navigator.userAgent;

			/*	TODO: check version as well.
			 *	Chrome ua string also contains keyword "Safari" */
			for (var b in GLOBE.CONFIGURATION.browsers) {
				if (ua.indexOf(b) > -1) {
					console.log("Identified browser: " + b);
					found++;
				}
			}

			if (found == 0) {
				throw "Browser not supported.";
			}
		},
		'factorToColor': function(factor) {
			var c = new THREE.Color();
			c.setHSL( ( 0.6 - ( factor * 0.5 ) ), 1.0, 0.5 );
			return c;
		},
		'flagUrl': function(iso) {
			return "img/flags/" + iso + ".png";
		}
	},
	'TYPES': { /* globe.js */ },
	'GEO': { /* lookup.js */ },
	'SCREENS': {
		'renderScreen': function(title,content) {
			var b = $('body').empty().css('font-family',["'Michroma'","sans-serif"]).css('color','#cccccc');
			var d = $('<div>').css('float','center').css('margin','50px').appendTo(b);
			var h = $('<h4>').html(title).appendTo(d);
			$('<div>').html(content).appendTo(d);
		},
		'renderUnsupportedBrowser': function() {
			console.log("Browser is not supported.");
			var d = $('<div>');
			for (var b in GLOBE.CONFIGURATION.browsers) {
				var be = $('<a>').attr('href',GLOBE.CONFIGURATION.browsers[b].url).appendTo(d);
				$('<img>').attr('src',GLOBE.CONFIGURATION.browsers[b].icon).appendTo(be);
			}
			this.renderScreen('Your browser is not supported. Please download a recent version of the supported once:',d);
		},
		'renderWebGLNotSupported': function() {
			console.log("WebGL is not enabled.");
			this.renderScreen('WebGL rendering is not enabled.','<p>Please consult your browser manual and enable WebGL.</p>');
		}
	},
	'WIDGETS': {
		'renderShareBar': function(sbid) {
			for (var i in GLOBE.CONFIGURATION.shareButtons) {
				var o =GLOBE.CONFIGURATION.shareButtons[i];
				var item = $('<div>');
				if (o.item !== undefined) {
					item = $(o.item);
				} else {
				
					item.css('background-image',"url('" + o.icon +"')");
					item.css('background-repeat','no-repeat');
					item.css('background-position','left center');
					item.attr('href',o.url);
					item.click(function() {
						window.open($(this).attr('href'),'_blank');
					});
				}
				item.css('width','24px');
				item.css('height','24px');
				item.css('float','left');
				item.css('padding-left','5px');
				item.appendTo(sbid);
			}
		}
	}
};

