var Q       = require('q')
  , mocha   = require('mocha')
  , sinon   = require('sinon')
  , chai    = require('chai')
  , present = require('present')
  , expect  = chai.expect

  , poll    = require('../lib/poll')
  , request = require('request')
  ;

describe('RingtailClient', function() {
  var RingtailClient = require('../lib/client')
    , instance
    , requestStub
    ;

  beforeEach(function() {
    instance = new RingtailClient({ serviceHost: '127.0.0.1' });
  });

  beforeEach(function() {
    requestStub = sinon.stub(request, 'get');      
  });

  afterEach(function() {
    requestStub.restore();
  });


  describe('.constructor', function() {
    it('should create the installUrl', function() {
      expect(instance.installUrl).to.equal('http://127.0.0.1:8080/api/installer');
    });

    it('should create the statusUrl', function() {
      expect(instance.statusUrl).to.equal('http://127.0.0.1:8080/api/status');
    });

    it('should create the updateUrl', function() {
      expect(instance.updateUrl).to.equal('http://127.0.0.1:8080/api/UpdateInstallerService');
    });

    it('should create the installUrl', function() {
      expect(instance.configUrl).to.equal('http://127.0.0.1:8080/api/config');
    });

    it('should create the installUrl', function() {
      expect(instance.installedUrl).to.equal('http://127.0.0.1:8080/api/installedBuilds');
    });
  });


  describe('.waitForService', function() {
    var fulfilledSpy;

    beforeEach(function() {        
      fulfilledSpy = sinon.spy(poll.until, 'fulfilled');
    });

    afterEach(function() {
      fulfilledSpy.restore();
    });

    it('should make get request to statusUrl', function(done) {
      requestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.waitForService(function(err, result) {        
        expect(requestStub.calledOnce).to.be.true;
        expect(requestStub.getCall(0).args[0].url).to.equal(instance.statusUrl);
        done();
      });      
    });

    it('should use wait logic', function(done) {      
      requestStub.onCall(0).yields(null, { statusCode: 200}, 'success');            
      instance.waitForService(function(err, result) {
        expect(fulfilledSpy.calledOnce).to.be.true;
        done();
      });
    });

    it('should retry on errors', function(done) {
      instance.pollInterval = 1;
      requestStub.onCall(0).yields('Error', null, null);
      requestStub.onCall(1).yields(null, { statusCode: 200}, 'success');            
      instance.waitForService(function(err, result) {
        expect(result).to.equal('success');
        done();
      });
    });

    it('should retry on bad status codes', function(done) {
      instance.pollInterval = 1;
      requestStub.onCall(0).yields(null, { statusCode: 500}, 'error');            
      requestStub.onCall(1).yields(null, { statusCode: 200}, 'success');            
      instance.waitForService(function(err, result) {
        expect(result).to.equal('success');
        done();
      });
    });

    it('should retry on timeouts', function(done) {
      instance.pollInterval = 1;
      requestStub.onCall(0).yields(null, { statusCode: 500}, 'error');            
      requestStub.onCall(1).yields(null, { statusCode: 200}, 'success');            
      instance.waitForService(function(err, result) {
        expect(result).to.equal('success');
        done();
      });
    });
  });


  describe('.setUpdatePath', function() {
    it('should make a request to setUpdatePathUrl', function(done) {
      var value = '\\\\testPath';
      requestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.setUpdatePath(value, function() {        
        expect(requestStub.calledOnce).to.be.true;
        expect(requestStub.getCall(0).args[0]).to.equal(instance.updateUrl + '?value=' + value);
        done();
      }); 
    });
  });

  describe('.update', function() {
    it('should make a request to updateUrl', function(done) {
      requestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.updateDelay = 1;
      instance.update(function() {        
        expect(requestStub.calledOnce).to.be.true;
        expect(requestStub.getCall(0).args[0]).to.equal(instance.updateUrl);
        done();
      }); 
    });
  });  


  describe('.status', function() {    
    it('should make get request to statusUrl', function(done) {
      requestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.status(function(result) {        
        expect(requestStub.calledOnce).to.be.true;
        expect(requestStub.getCall(0).args[0].url).to.equal(instance.statusUrl);
        done();
      });      
    });
  });


  describe('.setConfig', function() {
    it('should make get request to configUrl', function(done) {
      requestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.setConfig('Common|Test', 'value', function(err, result) {                
        expect(requestStub.calledOnce).to.be.true;
        expect(requestStub.getCall(0).args[0]).to.equal(instance.configUrl + '?key=Common%7CTest&value=value');
        done();
      });      
    });

    it('should resolve if config value does match', function(done) {
      requestStub.onCall(0).yields(null, { statusCode: 200}, '<p>Common|Test=\\"value\\"</p>');           
      instance.setConfig('Common|Test', 'value', function(err, result) {             
        expect(result).to.equal('value');
        done();
      });      
    });

    it('should reject if config value doesn\'t match with status message', function(done) {
      requestStub.onCall(0).yields(null, { statusCode: 200}, '<p>Common|Test=\\"old\\"</p>');           
      instance.setConfig('Common|Test', 'value', function(err, result) {             
        expect(err).to.equal('Config value not set correctly: \'old\' expected to be \'value\'');
        done();
      });      
    });

    it('should reject on error with the error', function(done) {
      requestStub.onCall(0).yields('error', null, null);           
      instance.setConfig('Common|Test', 'value', function(err, result) {             
        expect(err).to.equal('error');
        done();
      });      
    });

    it('should reject non-200 response with the response object', function(done) {
      requestStub.onCall(0).yields(null, { statusCode: 500}, 'BOOM');           
      instance.setConfig('Common|Test', 'value', function(err, result) {             
        expect(err.statusCode).to.equal(500);
        done();
      });      
    });
  });

  
  describe('.setConfigs', function() {
    it('should make a request to configUrl for each value', function(done) {
      var configs = {
        'Common|Test1': 'test1',
        'Common|Test2': 'test2',
        'Common|Test3': 'test3'
      };
      requestStub.onCall(0).yields(null, { statusCode: 200}, '<p>Common|Test1=\\"test1\\"</p>');
      requestStub.onCall(1).yields(null, { statusCode: 200}, '<p>Common|Test2=\\"test2\\"</p>');
      requestStub.onCall(2).yields(null, { statusCode: 200}, '<p>Common|Test3=\\"test3\\"</p>');
      instance.setConfigs(configs, function(err, result) {                
        expect(requestStub.callCount).to.equal(3);        
        expect(requestStub.getCall(0).args[0]).to.equal('http://127.0.0.1:8080/api/config?key=Common%7CTest1&value=test1');
        expect(requestStub.getCall(1).args[0]).to.equal('http://127.0.0.1:8080/api/config?key=Common%7CTest2&value=test2');
        expect(requestStub.getCall(2).args[0]).to.equal('http://127.0.0.1:8080/api/config?key=Common%7CTest3&value=test3');
        done();
      });      
    });

    it('should fail if any setter fails', function(done) {
      var configs = {
        'Common|Test1': 'test1',
        'Common|Test2': 'test2',
        'Common|Test3': 'test3'
      };
      requestStub.onCall(0).yields(null, { statusCode: 200}, '<p>Common|Test1=\\"test1\\"</p>');
      requestStub.onCall(1).yields(null, { statusCode: 200}, '<p>Common|Test2=\\"old\\"</p>');      
      instance.setConfigs(configs, function(err, result) {                
        expect(requestStub.callCount).to.equal(2);        
        expect(err).to.equal('Config value not set correctly: \'old\' expected to be \'test2\'');
        done();
      });      
    });
  });


  describe('.install', function() {
    it('should make get request to installUrl', function(done) {
      requestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.install(function(err, result) {                
        expect(requestStub.calledOnce).to.be.true;
        expect(requestStub.getCall(0).args[0]).to.equal(instance.installUrl);
        done();
      });      
    });
  });


  describe('.installed', function() {
    it('should make get request to installedUrl', function(done) {
      requestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.installed(function(err, result) {                
        expect(requestStub.calledOnce).to.be.true;
        expect(requestStub.getCall(0).args[0].url).to.equal(instance.installedUrl);
        done();
      });      
    });
    it('should return an array of values', function(done) {
      requestStub.onCall(0).yields(null, { statusCode: 200}, '"<p>Builds:</p><p>Something</p>"');
      instance.installed(function(err, result) {                        
        expect(result.length).to.equal(2);
        done();
      });
    });
  });


  describe('.waitForInstall', function() {
    var fulfilledSpy;

    beforeEach(function() {      
      fulfilledSpy = sinon.spy(poll.until, 'fulfilled');      
      instance.installDelay = 1;
    });

    afterEach(function() {      
      fulfilledSpy.restore();
    });

    it('should delay upon start', function(done) {      
      var start = present();
      instance.installDelay = 500;
      requestStub.onCall(0).yields(null, { statusCode: 200}, 'UPGRADE COMPLETE');
      instance.waitForInstall(null, function(err, result) {        
        var end = present();
        expect(end - start).to.be.gte(500);
        done();
      }); 
    });

    it('should make get request to statusUrl', function(done) {
      requestStub.onCall(0).yields(null, { statusCode: 200}, 'UPGRADE COMPLETE');
      instance.waitForInstall(null, function(err, result) {        
        expect(requestStub.calledOnce).to.be.true;
        expect(requestStub.getCall(0).args[0].url).to.equal(instance.statusUrl);
        done();
      });      
    });

    it('should use wait logic', function(done) {      
      requestStub.onCall(0).yields(null, { statusCode: 200}, 'UPGRADE COMPLETE');            
      instance.waitForInstall(null, function(err, result) {
        expect(fulfilledSpy.calledOnce).to.be.true;
        done();
      });
    });

    it('should retry on errors', function(done) {
      instance.pollInterval = 1;      
      requestStub.onCall(0).yields('Error', null, null);
      requestStub.onCall(1).yields(null, { statusCode: 200}, 'UPGRADE COMPLETE');            
      instance.waitForInstall(null, function(err, result) {
        expect(result).to.equal('UPGRADE COMPLETE');
        done();
      });
    });  

    it('should retry until UPGRADE COMPLETE', function(done) {
      instance.pollInterval = 1;      
      requestStub.onCall(0).yields('Error', null, null);
      requestStub.onCall(1).yields(null, { statusCode: 200}, '');            
      requestStub.onCall(2).yields(null, { statusCode: 200}, 'UPGRADE COMPLETE');            
      instance.waitForInstall(null, function(err, result) {
        expect(result).to.equal('UPGRADE COMPLETE');
        done();
      });
    });  

    it('should retry until UPGRADE SUCCESSFUL', function(done) {
      instance.pollInterval = 1;      
      requestStub.onCall(0).yields('Error', null, null);
      requestStub.onCall(1).yields(null, { statusCode: 200}, '');            
      requestStub.onCall(2).yields(null, { statusCode: 200}, 'UPGRADE SUCCESSFUL');            
      instance.waitForInstall(null, function(err, result) {
        expect(result).to.equal('UPGRADE SUCCESSFUL');
        done();
      });
    });  

    it('should retry until UPGRADE FAILED and have error', function(done) {
      instance.pollInterval = 1;      
      requestStub.onCall(0).yields('Error', null, null);
      requestStub.onCall(1).yields(null, { statusCode: 200}, '');            
      requestStub.onCall(2).yields(null, { statusCode: 200}, 'UPGRADE FAILED');            
      instance.waitForInstall(null, function(err, result) {
        expect(err.message).to.equal('UPGRADE FAILED');
        done();
      });
    });

    it('should retry until UPGRADE ABORTED and have error', function(done) {
      instance.pollInterval = 1;      
      requestStub.onCall(0).yields('Error', null, null);
      requestStub.onCall(1).yields(null, { statusCode: 200}, '');            
      requestStub.onCall(2).yields(null, { statusCode: 200}, 'UPGRADE ABORTED');            
      instance.waitForInstall(null, function(err, result) {
        expect(err.message).to.equal('UPGRADE ABORTED');
        done();
      });
    });    
  });

});