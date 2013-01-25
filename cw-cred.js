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
  .option('-s, --search [conditions]', 'search for configurations by conditions')
  .option('-q, --quicksearch [keyword]', 'search for configurations by keyword')
  .option('-g, --getrec [id]', 'get a configuration by id')
  .option('-f, --getfirst', 'get first matching configuration of search')
  .option('-a, --getall', 'get all matching configurations of search')
  .option('-v, --verbose', 'show useful messages')
  .parse(process.argv);

if (program.quicksearch) {
  // var likePattern = program.quicksearch.split('').join('%') + '%';
  var likePattern = program.quicksearch + '%';
  program.search = 'CompanyId like "' + likePattern + '" or ConfigurationName like "' + likePattern +'"';
}

if (program.search) {
  log("search for configurations matching condition " + program.search + "\n");
  cwSearch(program.search, function(searchResultData) {
    if (typeof(searchResultData) === 'undefined') {
      log('no results found matching conditions');
      return;
    }

    if (program.getfirst || program.getall) {
      var results = searchResultData.FindPartnerConfigurationsAction.ConfigurationFindResults[0];

      if (typeof(results.Configuration) !== 'undefined' && results.Configuration.length > 0) {
        var configurationRecIDs = [];
        for (var resultIndex in results.Configuration) {
          configurationRecIDs.push(results.Configuration[resultIndex].Id[0]);
          if (program.getfirst) {
            break;
          }
        }
        cw.getRecordsGenericAction('GetPartnerConfigurationAction', {}, configurationRecIDs, function(configurationRecords) {
          var formattedConfigs = configurationRecords.map(function(configurationRecord) {
            return cwConfigRec(configurationRecord.GetPartnerConfigurationAction.Configuration[0]);
          });

          output_json(formattedConfigs);
        });
      } else {
        log('no results found matching conditions');
      }
    } else { //not loading any results, just return matches
      output_json(searchResultData.FindPartnerConfigurationsAction.ConfigurationFindResults);
    }
  });
} else if (program.getrec) {
  var recid = program.getrec;
  log("getting configuration with id " + recid + "\n");
  cwGetRec(recid, function(configurationData) {
    if (configurationData.GetPartnerConfigurationAction.Configuration.length > 0) {
      cwConfigRec(configurationData.GetPartnerConfigurationAction.Configuration[0]);
    } else {
      log('configuration ' + recid + ' not found');
    }
  });
}

function cwGetRec(id, callback) {
  cw.genericAction('GetPartnerConfigurationAction', {
    'Id' : id
  } , callback);
}

function cwSearch(conditions, callback) {
  cw.genericAction('FindPartnerConfigurationsAction', {
    'Conditions' : conditions
  } , callback);
}

function cwConfigRec(config) {
  return {
    'ConfigurationName' : config.ConfigurationName[0]
  , 'Notes' : config.Notes[0]
  , 'Configuration': cw.configurationQuestionsFlatten(config.ConfigurationQuestions[0].ConfigurationQuestion)
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

function output_json(object) {
  // util.print(JSON.stringify(object));
  util.print(JSON.stringify(object, null, 2)+'\n');
}

function log(text) {
  if (program.verbose) {
    console.log(text);
  }
}
