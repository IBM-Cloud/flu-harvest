/*jshint node:true*/

// app.js
// Gets the latest weekly flu report from CDC's xml feed and sticks it into Cloudant
var fs = require('fs');
var Cloudant = require('cloudant');
var CronJob = require('cron').CronJob;
var express = require('express');
var app = express();
var http = require('http');
var request = require('request');
var parseString = require('xml2js').parseString;

//-- Cloudant settings
var password = process.env.CLOUDANTPASSWORD;
var dbuser = process.env.CLOUDANTUSER;
var dbname = process.env.CLOUDANTDB;
//-- end Cloudant

//-- express web server settings
app.set('title', 'FluHarvest');
app.use(express.static(__dirname + '/public'));
app.get('/latest', getLatest);
app.get('/query', query);
app.get('/harvest', harvestWeeklyFlu);

//-- URL to grab flu data
var fluurl = 'http://www.cdc.gov/flu/weekly/flureport.xml';
//-- outline of US states
var states = JSON.parse(fs.readFileSync('us-states.geojson'));
// console.log("got states: "+states.type);

// The IP address of the Cloud Foundry DEA (Droplet Execution Agent) that hosts this application:
var host = (process.env.VCAP_APP_HOST || 'localhost');
// The port on the DEA for communication with the application:
var port = (process.env.VCAP_APP_PORT || 3000);
// Start server
app.listen(port, host);

//-- Repeating job to harvest flu data every Saturday at 8:05 am
var thejob = new CronJob('00 05 08 * * 06', harvestWeeklyFlu); // every day at 8am GMT
thejob.start();
var counter = 0;

function query(req, res) {
	var week = '';
	if ( req.query.week && req.query.week.length > 5) {
		var q = 'https://opendata.cloudant.com/flureports/' + req.query.week; 
		request(q, function(err, resp, body) {
			var geo = false;
			if (err) res.send(err);
			
			body = JSON.parse(body);
			if ( req.query.geo && req.query.geo == 'true') geo = true;
			if ( geo ) {
				var statesx = JSON.parse( JSON.stringify(states) );
				sts = body.states;
				for (var i = 0; i < sts.length; i++) {
					var idx = findAbbrevIndex(sts[i].abbrev);
					if ( idx ) {
						statesx.features[idx].properties.flu = sts[i].label;
						statesx.features[idx].properties.flurank = sts[i].rank;
					}
				}
				res.send(statesx);
			} else { // not geo
				res.send(body);
			}
		});
	} else {
		sendError(res, "Include a week parameter. e.g.: week=2014-44")
		return;
	}
}

function getLatest(req, res) {
	// res.send("Here is the query: " + JSON.stringify(req.query) + "!");
	var q = 'https://opendata.cloudant.com/flureports/_all_docs' + 
	        '?descending=true&include_docs=true&limit=1';
	
	request(q, function(err, resp, body) {
		var geo = false;
		if (err) res.send(err);
		
		body = JSON.parse(body);
		
		if ( req.query.geo && req.query.geo == 'true') geo = true;
		
		if ( req.query.state ) {
			var su = req.query.state.toUpperCase();
			if ( su.length != 2 ) {
				sendError(res, "State must be a two-letter state abbreviation");
				return;
			}
			for (var i = 0; i < body.rows[0].doc.states.length; i++) {
				if (body.rows[0].doc.states[i].abbrev == su ) {
					var st = body.rows[0].doc.states[i];
					if ( geo ) {
						var idx = findAbbrevIndex(st.abbrev);
						var statesx = JSON.parse( JSON.stringify(states) );
						statesx.features[idx].properties.flu = st.label;
						statesx.features[idx].properties.flurank = st.rank;
						st = statesx;
					}
					res.send(st);
					return;
				}
			}
			sendError(res, "Could not find state: " + req.query.state);
		} else {
			if ( geo ) {
				var statesx = JSON.parse( JSON.stringify(states) );
				sts = body.rows[0].doc.states;
				for (var i = 0; i < sts.length; i++) {
					var idx = findAbbrevIndex(sts[i].abbrev);
					if ( idx ) {
						statesx.features[idx].properties.flu = sts[i].label;
						statesx.features[idx].properties.flurank = sts[i].rank;
					}
				}
				res.send(statesx);
			} else { // not geo
				res.send(body.rows[0].doc);
			}
		}
	});	
}

function sendError(res, msg, errorcode) {
	errorcode = errorcode || 400;
	res.set({
		'Content-Type': 'application/json'
	})
	res.status(errorcode).send({"message": msg});
}

function harvestWeeklyFlu(req, res) {
	request(fluurl, function(requesterr, response, body) {
		if ( !requesterr && response.statusCode == 200 ) {

			parseString(body, function(xmlerr, result) {
				if ( !xmlerr ) {
					var i = result.flureport.timeperiod.length;
					// get the last timeperiod object in the data stream
					var weeklyreport = processData(result.flureport.timeperiod[i-1]);
					persist(weeklyreport);
				}
				if ( res ) res.send( "harvested " + result.flureport.timeperiod[i-1].toString());
			});

		} else {
			if ( res ) sendError(res, JSON.stringify(requesterr));
		}
	});
}

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

function findAbbrevIndex(abbrev) {
	for (var i = 0; i < states.features.length; i++) {
		var state = states.features[i];
		if ( state.properties.STATE_ABBR == abbrev ) return i;
	}
	return null;
}

function persist(json) {
	Cloudant({account:dbuser, password:password}, function(er, cloudant) {
		if (er) return console.error('Error connecting to Cloudant account %s: %s', dbuser, er.message);
		// specify the database we are going to use
		var thedb = cloudant.db.use(dbname);
		thedb.insert(json, function(err, body) {
			if ( err ) {
				console.error("Error writing JSON: " + json);
				console.error(err);
			}
		});
	});
}
