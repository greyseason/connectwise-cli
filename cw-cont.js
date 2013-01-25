var fs   = require('fs');
var util = require('util');
var program = require('commander');

 //load connectwise-api module and initialise with user config
var Connectwise = require('connectwise-api');
var connectwiseConfig = require('./connectwise-config.json');
var cw = new Connectwise(connectwiseConfig);

var maxResults = 3;

program
  .version('0.0.1')
  .option('-s, --search [conditions]', 'search for contacts by conditions')
  .option('-q, --quicksearch [keyword]', 'search for contacts by keyword')
  .option('-g, --getrec [id]', 'get a contact by id')
  .option('-f, --getfirst', 'get first matching contact of search')
  .option('-a, --getall', 'get all matching contacts of search')
  .option('-v, --verbose', 'show useful messages')
  .parse(process.argv);

if (program.quicksearch) {
  program.search = ['CompanyName LIKE "',program.quicksearch,'%" OR FirstName LIKE "',program.quicksearch,'%" OR LastName LIKE "',program.quicksearch,'%" OR Email LIKE "',program.quicksearch,'%"'].join('');
}

if (program.search) {
  log("search for contacts matching condition " + program.search + "\n");
  cwSearch(program.search, function(searchResultData) {
    if (typeof(searchResultData) === 'undefined') {
      log('no results found matching conditions');
      return;
    }

    var results = searchResultData.FindPartnerContactsAction.Contacts[0].Contact;

    if (typeof(results) !== 'undefined' && results.length > 0) {
      output_json(results.map(function(contactRecord) {
          return cwCleanRecord(contactRecord);
        }));
    } else {
      log('no results found matching conditions');
    }

  });
} else if (program.getrec) {
  var recid = program.getrec;
  log("getting contact with id " + recid + "\n");
  cwGetRec(recid, function(contactData) {
    if (contactData.GetPartnerContactAction.Contact.length > 0) {
      cwConfigRec(contactData.GetPartnerContactAction.Contact[0]);
    } else {
      log('contact ' + recid + ' not found');
    }
  });
}

function cwGetRec(id, callback) {
  cw.genericAction('GetPartnerContactAction', {
    'Id' : id
  } , callback);
}

function cwSearch(conditions, callback) {
  cw.genericAction('FindPartnerContactsAction', {
    'Conditions' : conditions
  } , callback);
}

function cwConfigRec(config) {
  return {
    'ContactName' : config.ContactName[0]
  , 'Notes' : config.Notes[0]
  , 'Contact': cwFlattenConfig(config.ContactQuestions[0].ContactQuestion)
  };
}

function cwFlattenConfig(config) {
  var flattened = {};
  for (var i = config.length - 1; i >= 0; i--) {
    if (config[i]['Answer'][0].length > 0) {
      flattened[config[i]['Question']] = config[i]['Answer'][0];
    }
  };
  return flattened;
}

function cwCleanRecord(record) {
  var flattened = {};
  for (var property in record) {
    if (record[property].length === 1) {
      flattened[property] = record[property][0];
    } else {
      flattened[property] = record[property];
    }
  };
  return flattened;
}

function output_json(object) {
  // util.print(JSON.stringify(object));
  util.print(JSON.stringify(object, null, 2)+'\n');
}

function log(text) {
  if (program.verbose) {
    console.log(text);
  }
}
