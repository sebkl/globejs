/* Namespace to be used: GLOBE */
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
	}
};
