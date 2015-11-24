var Cloudant = require('cloudant');
var express = require('express');
var app = express();
var http = require('http');
var request = require('request');
var parseString = require('xml2js').parseString;

var fluurl = 'http://www.cdc.gov/flu/weekly/flureport.xml';

request(fluurl, function(requesterr, response, body) {
	if ( !requesterr && response.statusCode == 200 ) {

		parseString(body, function(xmlerr, result) {
			if ( !xmlerr ) {
				// console.dir( result.flureport.timeperiod[0].state[0] );
				// console.dir( result.flureport );
				for (var i = 0; i < result.flureport.timeperiod.length; i++) {
					var weeklyreport = processData(result.flureport.timeperiod[i]);
					persist(weeklyreport);
				}
			}
		});

	} else {
		// log request error
	}
});

function processData(weeklydata) {
	var weeklyreport = {
		type: "cdc-flu-report", 
		_id: weeklydata.$.year + '-' + weeklydata.$.number, 
	};

	var statedata = new Array();
	for (var j = 0; j < weeklydata.state.length; j++) {
		var state = weeklydata.state[j];
		var stateinfo = { 
			abbrev: state.abbrev[0], 
			label: state.label[0], 
			rank: getRank(state.label[0]) 
		};
		statedata.push(stateinfo);
	}
	weeklyreport.states = statedata;
	return weeklyreport;
}

function getRank(label) {
	switch (label) {
		case "Widespread": 
			return 6;
		case "Regional": 
			return 5;
		case "Local": 
			return 4;
		case "Sporadic": 
			return 3;
		case "No Activity": 
			return 2;
		default: 
			return 1; // "No Report"
	}
	return 0;
}

function persist(json) {
	dbname = "flureports";
	dbuser = 'opendata';
	password = 'NVFH8ReUf9cnz';

	Cloudant({account:dbuser, password:password}, function(er, cloudant) {
		if (er) return console.log('Error connecting to Cloudant account %s: %s', dbuser, er.message);
		// specify the database we are going to use
		var thedb = cloudant.db.use(dbname);
		thedb.insert(json, function(err, body) {
			if ( err ) {
				console.error("Error writing report: " + json);
				console.error(err);
			}
		});
	});
}
