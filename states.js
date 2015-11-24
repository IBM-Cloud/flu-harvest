var request = require('request');
var states = null;

var q = "https://gist.githubusercontent.com/rajrsingh/11caaaf620689f6904c8/raw/b4bb5e21a0fa0d37be8b17402f2baa65ee2d896f/us-states.geo.json";
request(q, function(err, resp, body) {
	if (err) res.send(err);
	states = JSON.parse(body);
	console.log( findAbbrevIndex("MI") );
});

function findAbbrevIndex(abbrev) {
	for (var i = 0; i < states.features.length; i++) {
		var state = states.features[i];
		if ( state.properties.STATE_ABBR == abbrev ) return i;
	}
	return null;
}