var _ = require('underscore')

  , keyValueRegex
  , parseBody
  , parseLine
  ;

exports.keyValueRegex = keyValueRegex = /^(.+\|.+)=(.*)/;

/** 
 * Takes the raw HTML result of the Ringtail Install Service CONFIG and 
 * converts it into an array of strings that can be converted to KVP's
 * 
 * @param {string} body of HTML to convert
 * @return {array} raw lines of KVP's
 */
exports.parseBody = parseBody = function(body) {
  var rawConfig
    , lines
    , results
    ;

  rawConfig = body
    .replace(/<p\>/g, '')
    .replace(/<\/p\>/g, '\r\n');

  lines = rawConfig.split('\r\n');    

  results = _.filter(lines, function(line) { 
    return keyValueRegex.test(line);
  });
 
  return results;
};


/**
 * Parses a line into key value an object representing key value pairs
 *
 * @param {string} line of CONFIG data
 * @return {object} object with key and value properties
 */
exports.parseLine = parseLine = function(line) {
  var results = keyValueRegex.exec(line)
    , value = results[2].substring(1,results[2].length-1)
    ;  
  return {
    key: results[1],
    value: value
  };
};


/**
 * Parses the body HTML into an object that uses the config Keys as
 * properties and has the KVP object as the value
 *
 * @param {string} body of HTML to convert
 * @return {object} object with KVP as properties with the property the name of the key
 */
exports.parse = function(body) {
  var lines   = parseBody(body)
    , kvps    = lines.map(parseLine)
    , result  = {}
    ;

  kvps.forEach(function(kvp) {
    result[kvp.key] = kvp;
  });

  return result;
};