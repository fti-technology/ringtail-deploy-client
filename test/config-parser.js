var Q       = require('q')
  , mocha   = require('mocha')
  , sinon   = require('sinon')
  , chai    = require('chai')
  , expect  = chai.expect
  ;

describe('config-parser', function() {
  var configParser = require('../lib/config-parser');


  describe('keyValueRegex', function() {
    it('should match valid KeyValue pairs', function() {
      var input   = 'Common|BRANCH=\\"main\\"'
        , result  = configParser.keyValueRegex.test(input)
        ;
      expect(result).to.be.true;
    });

    it('should match valid KeyValue pairs with empty value', function() {
      var input   = 'Common|BRANCH=\\"\\"'
        , result  = configParser.keyValueRegex.test(input)
        ;
      expect(result).to.be.true;
    });

    it('should not match text', function() {
      var input  = 'some text'
        , result = configParser.keyValueRegex.test(input);
      expect(result).to.be.false;
    });

    it('should not match missing applications', function() {
      var input  = '|BRANCH=\\"main\\"'
        , result = configParser.keyValueRegex.test(input);
      expect(result).to.be.false;
    });

    it('should not match missing key', function() {
      var input   = 'Common|=\\"main\\"'
        , result  = configParser.keyValueRegex.test(input)
        ;
      expect(result).to.be.false;
    });

    it('should not match missing value', function() {
      var input   = 'Common|BRANCH'
        , result  = configParser.keyValueRegex.test(input)
        ;
      expect(result).to.be.false;
    });
  });


  describe('.parseBody', function() {
    it('should parse into correct lines', function() {
      var body = '"<p>............Action..........Success</p><p>Common|BRANCH_NAME=\\"MAIN\\"</p><p>Common|IS_SQLSERVER_USERNAME=\\"sa\\"</p><p>Common|IS_SQLSERVER_PASSWORD=\\"password\"</p><p>Common|IS_SQLSERVER_SERVER=\\"server\\"</p><p>Common|IS_SQLSERVER_DATABASE=\\"database\\"</p><p></p><p>RoleResolver|ROLE=\\"MY-ROLE\\"</p>"';
      var lines = configParser.parseBody(body);
      expect(lines.length).to.equal(6);
    });
  });

  describe('.parseLine', function() {
    it('should parse a line into a key value pair', function() {
      var line = 'Common|BRANCH_NAME=\\"MAIN\\"';
      var result = configParser.parseLine(line);
      expect(result.key).to.equal('Common|BRANCH_NAME');
      expect(result.value).to.equal('MAIN');
    });
  });

  describe('.parse', function() {
    it('should convert the body into an object', function() {
      var body = '"<p>............Action..........Success</p><p>Common|BRANCH_NAME=\\"MAIN\\"</p><p>Common|IS_SQLSERVER_USERNAME=\\"sa\\"</p><p>Common|IS_SQLSERVER_PASSWORD=\\"password\\"</p><p>Common|IS_SQLSERVER_SERVER=\\"server\\"</p><p>Common|IS_SQLSERVER_DATABASE=\\"database\\"</p><p></p><p>RoleResolver|ROLE=\\"MY-ROLE\\"</p>"';      
      var result = configParser.parse(body);
      expect(result['Common|BRANCH_NAME'].value).to.equal('MAIN');
      expect(result['Common|IS_SQLSERVER_USERNAME'].value).to.equal('sa');
      expect(result['Common|IS_SQLSERVER_PASSWORD'].value).to.equal('password');
      expect(result['Common|IS_SQLSERVER_SERVER'].value).to.equal('server');
      expect(result['Common|IS_SQLSERVER_DATABASE'].value).to.equal('database');
      expect(result['RoleResolver|ROLE'].value).to.equal('MY-ROLE');
    });
  });
});