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
    , getRequestStub
    , postRequestStub
    ;

  beforeEach(function() {
    instance = new RingtailClient({ serviceHost: '127.0.0.1' });
  });

  beforeEach(function() {
    getRequestStub = sinon.stub(request, 'get');
    postRequestStub = sinon.stub(request, 'post');
  });

  afterEach(function() {
    getRequestStub.restore();
    postRequestStub.restore();
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

    it('should create the setMasterConfigUrl', function() {
      expect(instance.setMasterConfigUrl).to.equal('http://127.0.0.1:8080/api/UpdateServiceConfig/Update');
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
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.waitForService(function(err, result) {        
        expect(getRequestStub.calledOnce).to.be.true;
        expect(getRequestStub.getCall(0).args[0].url).to.equal(instance.statusUrl);
        done();
      });      
    });

    it('should use wait logic', function(done) {      
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'success');            
      instance.waitForService(function(err, result) {
        expect(fulfilledSpy.calledOnce).to.be.true;
        done();
      });
    });

    it('should retry on errors', function(done) {
      instance.pollInterval = 1;
      getRequestStub.onCall(0).yields('Error', null, null);
      getRequestStub.onCall(1).yields(null, { statusCode: 200}, 'success');            
      instance.waitForService(function(err, result) {
        expect(result).to.equal('success');
        done();
      });
    });

    it('should retry on bad status codes', function(done) {
      instance.pollInterval = 1;
      getRequestStub.onCall(0).yields(null, { statusCode: 500}, 'error');            
      getRequestStub.onCall(1).yields(null, { statusCode: 200}, 'success');            
      instance.waitForService(function(err, result) {
        expect(result).to.equal('success');
        done();
      });
    });

    it('should retry on timeouts', function(done) {
      instance.pollInterval = 1;
      getRequestStub.onCall(0).yields(null, { statusCode: 500}, 'error');            
      getRequestStub.onCall(1).yields(null, { statusCode: 200}, 'success');            
      instance.waitForService(function(err, result) {
        expect(result).to.equal('success');
        done();
      });
    });
  });

  describe('.waitForServiceLimited', function() {
    var fulfilledSpy;

    beforeEach(function() {        
      fulfilledSpy = sinon.spy(poll.until, 'fulfilled');
    });

    afterEach(function() {
      fulfilledSpy.restore();
    });

    it('should make get request to statusUrl', function(done) {
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.waitForServiceLimited(50, function(err, result) {        
        expect(getRequestStub.calledOnce).to.be.true;
        expect(getRequestStub.getCall(0).args[0].url).to.equal(instance.statusUrl);
        done();
      });      
    });
  });  


  describe('.setUpdatePath', function() {
    it('should make a request to setUpdatePathUrl', function(done) {
      var value = '\\\\testPath';
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.setUpdatePath(value, function() {        
        expect(getRequestStub.calledOnce).to.be.true;
        expect(getRequestStub.getCall(0).args[0]).to.equal(instance.updateUrl + '?value=' + value);
        done();
      }); 
    });
  });

  describe('.update', function() {
    it('should make a request to updateUrl', function(done) {
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.updateDelay = 1;
      instance.update(function() {        
        expect(getRequestStub.calledOnce).to.be.true;
        expect(getRequestStub.getCall(0).args[0]).to.equal(instance.updateUrl);
        done();
      }); 
    });
  });  


  describe('.status', function() {    
    it('should make get request to statusUrl', function(done) {
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.status(function(result) {        
        expect(getRequestStub.calledOnce).to.be.true;
        expect(getRequestStub.getCall(0).args[0].url).to.equal(instance.statusUrl);
        done();
      });      
    });
  });


  describe('.setConfig', function() {
    it('should make get request to configUrl', function(done) {
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.setConfig('Common|Test', 'value', function(err, result) {                
        expect(getRequestStub.calledOnce).to.be.true;
        expect(getRequestStub.getCall(0).args[0]).to.equal(instance.configUrl + '?key=Common%7CTest&value=value');
        done();
      });      
    });

    it('should resolve if config value does match', function(done) {
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, '<p>Common|Test=\\"value\\"</p>');           
      instance.setConfig('Common|Test', 'value', function(err, result) {             
        expect(result).to.equal('value');
        done();
      });      
    });

    it('should reject if config value doesn\'t match with status message', function(done) {
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, '<p>Common|Test=\\"old\\"</p>');           
      instance.setConfig('Common|Test', 'value', function(err, result) {             
        expect(err).to.equal('Config value not set correctly: \'old\' expected to be \'value\'');
        done();
      });      
    });

    it('should reject on error with the error', function(done) {
      getRequestStub.onCall(0).yields('error', null, null);           
      instance.setConfig('Common|Test', 'value', function(err, result) {             
        expect(err).to.equal('error');
        done();
      });      
    });

    it('should reject non-200 response with the response object', function(done) {
      getRequestStub.onCall(0).yields(null, { statusCode: 500}, 'BOOM');           
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
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, '<p>Common|Test1=\\"test1\\"</p>');
      getRequestStub.onCall(1).yields(null, { statusCode: 200}, '<p>Common|Test2=\\"test2\\"</p>');
      getRequestStub.onCall(2).yields(null, { statusCode: 200}, '<p>Common|Test3=\\"test3\\"</p>');
      instance.setConfigs(configs, function(err, result) {                
        expect(getRequestStub.callCount).to.equal(3);        
        expect(getRequestStub.getCall(0).args[0]).to.equal('http://127.0.0.1:8080/api/config?key=Common%7CTest1&value=test1');
        expect(getRequestStub.getCall(1).args[0]).to.equal('http://127.0.0.1:8080/api/config?key=Common%7CTest2&value=test2');
        expect(getRequestStub.getCall(2).args[0]).to.equal('http://127.0.0.1:8080/api/config?key=Common%7CTest3&value=test3');
        done();
      });      
    });

    it('should fail if any setter fails', function(done) {
      var configs = {
        'Common|Test1': 'test1',
        'Common|Test2': 'test2',
        'Common|Test3': 'test3'
      };
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, '<p>Common|Test1=\\"test1\\"</p>');
      getRequestStub.onCall(1).yields(null, { statusCode: 200}, '<p>Common|Test2=\\"old\\"</p>');      
      instance.setConfigs(configs, function(err, result) {                
        expect(getRequestStub.callCount).to.equal(2);        
        expect(err).to.equal('Config value not set correctly: \'old\' expected to be \'test2\'');
        done();
      });      
    });
  });

  describe('.setMasterCredentials', function() {
    var credentials = {
      'runasUser': 'testUser',
      'runasPassword': 'testPass'
    };
    it('should make a post request to setMasterConfigUrl with the username and password', function(done) {
      postRequestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.setMasterCredentials(credentials, function(err, result) {
        expect(postRequestStub.callCount).to.equal(1);
        //expect(postRequestStub.getCall(0).args[0].to.equal('http://127.0.0.1:8080/api/UpdateServiceConfig/Update'));
        done();
      });
    });
  });


  describe('.install', function() {
    it('should make get request to installUrl', function(done) {
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.install(function(err, result) {                
        expect(getRequestStub.calledOnce).to.be.true;
        expect(getRequestStub.getCall(0).args[0]).to.equal(instance.installUrl);
        done();
      });      
    });
  });


  describe('.installed', function() {
    it('should make get request to installedUrl', function(done) {
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.installed(function(err, result) {                
        expect(getRequestStub.calledOnce).to.be.true;
        expect(getRequestStub.getCall(0).args[0].url).to.equal(instance.installedUrl);
        done();
      });      
    });
    it('should return an array of values', function(done) {
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, '"<p>Builds:</p><p>Something</p>"');
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
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'UPGRADE COMPLETE');
      instance.waitForInstall(null, function(err, result) {        
        var end = present();
        expect(end - start).to.be.gte(500);
        done();
      }); 
    });

    it('should make get request to statusUrl', function(done) {
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'UPGRADE COMPLETE');
      instance.waitForInstall(null, function(err, result) {        
        expect(getRequestStub.calledOnce).to.be.true;
        expect(getRequestStub.getCall(0).args[0].url).to.equal(instance.statusUrl);
        done();
      });      
    });

    it('should use wait logic', function(done) {      
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'UPGRADE COMPLETE');            
      instance.waitForInstall(null, function(err, result) {
        expect(fulfilledSpy.calledOnce).to.be.true;
        done();
      });
    });

    it('should retry on errors', function(done) {
      instance.pollInterval = 1;      
      getRequestStub.onCall(0).yields('Error', null, null);
      getRequestStub.onCall(1).yields(null, { statusCode: 200}, 'UPGRADE COMPLETE');            
      instance.waitForInstall(null, function(err, result) {
        expect(result).to.equal('UPGRADE COMPLETE');
        done();
      });
    });  

    it('should retry until UPGRADE COMPLETE', function(done) {
      instance.pollInterval = 1;      
      getRequestStub.onCall(0).yields('Error', null, null);
      getRequestStub.onCall(1).yields(null, { statusCode: 200}, '');            
      getRequestStub.onCall(2).yields(null, { statusCode: 200}, 'UPGRADE COMPLETE');            
      instance.waitForInstall(null, function(err, result) {
        expect(result).to.equal('UPGRADE COMPLETE');
        done();
      });
    });  

    it('should retry until UPGRADE SUCCESSFUL', function(done) {
      instance.pollInterval = 1;      
      getRequestStub.onCall(0).yields('Error', null, null);
      getRequestStub.onCall(1).yields(null, { statusCode: 200}, '');            
      getRequestStub.onCall(2).yields(null, { statusCode: 200}, 'UPGRADE SUCCESSFUL');            
      instance.waitForInstall(null, function(err, result) {
        expect(result).to.equal('UPGRADE SUCCESSFUL');
        done();
      });
    });  

    it('should retry until UPGRADE FAILED and have error', function(done) {
      instance.pollInterval = 1;      
      getRequestStub.onCall(0).yields('Error', null, null);
      getRequestStub.onCall(1).yields(null, { statusCode: 200}, '');            
      getRequestStub.onCall(2).yields(null, { statusCode: 200}, 'UPGRADE FAILED');            
      instance.waitForInstall(null, function(err, result) {
        expect(err.message).to.equal('UPGRADE FAILED');
        done();
      });
    });

    it('should retry until UPGRADE ABORTED and have error', function(done) {
      instance.pollInterval = 1;      
      getRequestStub.onCall(0).yields('Error', null, null);
      getRequestStub.onCall(1).yields(null, { statusCode: 200}, '');            
      getRequestStub.onCall(2).yields(null, { statusCode: 200}, 'UPGRADE ABORTED');            
      instance.waitForInstall(null, function(err, result) {
        expect(err.message).to.equal('UPGRADE ABORTED');
        done();
      });
    });    
  });

  describe('.validate', function() {
    it('should make get request to installDiagnositcUrl', function(done) {
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'success');
      instance.validate(function(err, result) {                
        expect(getRequestStub.calledOnce).to.be.true;
        expect(getRequestStub.getCall(0).args[0]).to.equal(instance.installDiagnositcUrl);
        done();
      });      
    });
  });  

  describe('.waitForValidate', function() {
    var fulfilledSpy;

    beforeEach(function() {      
      fulfilledSpy = sinon.spy(poll.until, 'fulfilled');      
      instance.installDelay = 1;
      instance.installDiagnosticDelay = 1;
      instance.installDiagnosticTimeout = 100;
      instance.pollIntervalDiagnostic = 10;
    });

    afterEach(function() {      
      fulfilledSpy.restore();
    });

    it('should delay upon start', function(done) {      
      var start = present();
      instance.installDelay = 500;
      instance.installDiagnosticDelay = 100;
      instance.installDiagnosticTimeout = 100;
      instance.pollIntervalDiagnostic = 100;
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'UPGRADE COMPLETE');
      instance.waitForValidate(null, function(err, result) {        
        var end = present();
        expect(end - start).to.be.gte(100);
        done();
      }); 
    });

    it('should make get request to installDiagnositcResultUrl', function(done) {
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'UPGRADE COMPLETE');
      instance.waitForValidate(null, function(err, result) {        
        expect(getRequestStub.calledOnce).to.be.true;
        expect(getRequestStub.getCall(0).args[0].url).to.equal(instance.installDiagnositcResultUrl);
        done();
      });      
    });

    it('should use wait logic', function(done) {      
      getRequestStub.onCall(0).yields(null, { statusCode: 200}, 'UPGRADE COMPLETE');            
      instance.waitForValidate(null, function(err, result) {
        expect(fulfilledSpy.calledOnce).to.be.true;
        done();
      });
    });

    it('should retry on errors', function(done) {
      instance.pollInterval = 1;      
      getRequestStub.onCall(0).yields('Error', null, null);
      getRequestStub.onCall(1).yields(null, { statusCode: 200}, 'UPGRADE COMPLETE');            
      instance.waitForValidate(null, function(err, result) {
        expect(result).to.equal('UPGRADE COMPLETE');
        done();
      });
    });  

    it('should retry until UPGRADE COMPLETE', function(done) {
      instance.pollInterval = 1;      
      getRequestStub.onCall(0).yields('Error', null, null);
      getRequestStub.onCall(1).yields(null, { statusCode: 200}, '');            
      getRequestStub.onCall(2).yields(null, { statusCode: 200}, 'UPGRADE COMPLETE');            
      instance.waitForValidate(null, function(err, result) {
        expect(result).to.equal('UPGRADE COMPLETE');
        done();
      });
    });  

    it('should retry until UPGRADE SUCCESSFUL', function(done) {
      instance.pollInterval = 1;      
      getRequestStub.onCall(0).yields('Error', null, null);
      getRequestStub.onCall(1).yields(null, { statusCode: 200}, '');            
      getRequestStub.onCall(2).yields(null, { statusCode: 200}, 'UPGRADE SUCCESSFUL');            
      instance.waitForValidate(null, function(err, result) {
        expect(result).to.equal('UPGRADE SUCCESSFUL');
        done();
      });
    });  

    it('should retry until UPGRADE ABORTED and have error', function(done) {
      instance.pollInterval = 1;      
      getRequestStub.onCall(0).yields('Error', null, null);
      getRequestStub.onCall(1).yields(null, { statusCode: 200}, '');            
      getRequestStub.onCall(2).yields(null, { statusCode: 200}, 'UPGRADE ABORTED');            
      instance.waitForValidate(null, function(err, result) {
        expect(err.message).to.equal('UPGRADE ABORTED');
        done();
      });
    });    
  });


});