/* Namespace to be used: GLOBE */
var GLOBE = GLOBE || {
	'HELPER': {
		'dayOfYear': function(d) {
			var first = new Date(d.getFullYear(), 0, 1);
			var theDay = Math.round(((d - first) / 1000 / 60 / 60 / 24) + .5, 0);
			return d;
		}
	},
	'TYPES': { },
	'GEO': { }
};
