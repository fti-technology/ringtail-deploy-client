var debug         = require('debug')('deployer-client')
  , Q             = require('q')
  , _             = require('underscore')
  , request       = require('request')
  , poll          = require('./poll')
  , configParser  = require('./config-parser')
  , htmlParser    = require('./html-parser')
  ;

function RingtailClient(options) {
  _.extend(this, options); 
  this.sslEnabled = (options.sslMode && options.sslMode.toLowerCase() !== 'none');
  this.sslStrict = (options.sslMode && options.sslMode.toLowerCase() === 'strict');

  this.serviceProtocol = (this.sslEnabled)? 'https' : 'http';
  this.servicePort = '8080';
  this.serviceRootUrl = `${this.serviceProtocol}://${this.serviceHost}:${this.servicePort}/api`; 

  this.installUrl                 = this.serviceRootUrl + '/installer';
  this.installDiagnositcUrl       = this.serviceRootUrl + '/installDiagnostic';
  this.installDiagnositcResultUrl = this.serviceRootUrl + '/config?filename=masterLog.txt';
  this.statusUrl                  = this.serviceRootUrl + '/status';
  this.isUpUrl                    = this.serviceRootUrl + '/help';
  this.updateUrl                  = this.serviceRootUrl + '/UpdateInstallerService';
  this.configUrl                  = this.serviceRootUrl + '/config';
  this.installedUrl               = this.serviceRootUrl + '/installedBuilds';
  this.launchKeysUrl              = this.serviceRootUrl + '/AvailableFeatures';
  this.existingConfigsUrl         = this.serviceRootUrl + '/ExistingConfiguration';
  this.retryUrl                   = this.serviceRootUrl + '/retry';
  this.preReqUrl                  = this.serviceRootUrl + '/Prerequisite?minGB=7';
  this.setMasterConfigUrl         = this.serviceRootUrl + '/UpdateServiceConfig/Update';
  this.setDeploymentConfigUrl     = this.serviceRootUrl + '/UpdateDeploymentConfig/Update';
  this.isRunningUrl               = this.serviceRootUrl + '/IsRunning';

  this.pollInterval             = 15 * 1000;    // 15 seconds
  this.requestTimeout           = 10 * 1000;    // 10 seconds
  this.installDelay             = 15 * 1000;    // 15 seconds
  this.waitTimeout              = 600 * 1000;   // 10 minutes
  this.updateDelay              = 15 * 1000;    // 15 seconds
  this.installTimeout           = 6000 * 1000;  // 100 minutes
  this.installDiagnosticTimeout = 90 * 1000;    // 90 seconds
  this.installDiagnosticDelay   = 6 * 1000;     // 6 seconds
  this.pollIntervalDiagnostic   = 5 * 1000;     // 5 seconds
}

module.exports = RingtailClient;


RingtailClient.prototype.assignGetRequest = function assignGetRequest(url, promise, resolveFn) {
  let requestOptions = this.getRequestOptions(url);

  request.get(requestOptions, function(err, response, body) {   
    if(response && response.statusCode === 200) {  
      let resolveOut = {Err: null, Val: null};
      if (resolveFn) {
        resolveFn(body, resolveOut);
        if (resolveOut.Err) {promise.reject(resolveOut.Err);}
        else if (resolveOut.Val) {promise.resolve(resolveOut.Val);}
        else {promise.resolve(body);}
      }
      else {promise.resolve(body);}
    } else if(err) {
      promise.reject(err);
    } else {
      promise.reject(response);
    }      
  });
}


RingtailClient.prototype.getRequestOptions = function getRequestOptions(url) {
  let requestOptions = {url: url, timeout: this.requestTimeout};
  if (this.sslEnabled) {
    requestOptions.strictSSL = this.sslStrict;
  }

  return requestOptions;
}


/**
 * Sets the config value
 * 
 * @param {string} key to set
 * @param {string} value to set
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.setConfig = function setConfig(key, value, next) {
  let deferred = new Q.defer()    
    , url = this.configUrl + '?key=' + encodeURIComponent(key) + '&value=' + encodeURIComponent(value)
    , resolveFn = function(body, resolveOut){
        let config = configParser.parse(body);
        if(config[key] && config[key].value != value) { 
          resolveOut.Err = 'Config value not set correctly: \'' + config[key].value + '\' expected to be \'' + value + '\'';
        } else {resolveOut.Val = value};
    };
  
  this.assignGetRequest(url, deferred, resolveFn);
  
  return deferred.promise.nodeify(next); 
};


/**
 * Sets multiple configs by serializing requests to the 
 * config service
 *
 * @param {object} opts to set on the service
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.setConfigs = function setConfigs(opts, next) {
  var keys  = _.keys(opts)
    , me    = this
    , funcs
    ;

  debug('setting configs');

  funcs = keys.map(function(key) {
    var value = opts[key];
    return function() {     
      return me.setConfig(key, value);
    };
  });

  /* jshint es5:false */
  /* jshint newcap:false */
  return funcs.reduce(Q.when, Q())
    .then(function() {
      return opts;
    })
    .nodeify(next);
};


/**
 * Gets the config values
 * 
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.getConfigs = function getConfigs(next) {
  let deferred = new Q.defer();
    
  this.assignGetRequest(this.configUrl, deferred);
  
  return deferred.promise.nodeify(next)
    
};


/**
 * Gets the config values
 * 
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.getExistingConfigs = function getExistingConfigs(next) {
  let deferred = new Q.defer()    
    , resolveFn = function(body, resolveOut){
        let x = JSON.parse(body)
          , translatedExistingConfigs = {};
    
        _.each(x, function(config) {
          // each row should come in of the shape [{ Key: '', Value: ''}]   ..if it doesn't come in that shape, try parsing as object.
          let cfg = Array.isArray(config) && config.length === 1 ? config[0] : config;
          translatedExistingConfigs[cfg.Key] = cfg.Value;
        });
        resolveOut.Val = translatedExistingConfigs;
    };
  
  this.assignGetRequest(this.existingConfigsUrl, deferred, resolveFn);
  
  return deferred.promise.nodeify(next); 
};


/**
 * Gets the launch keys for a build
 * 
 * @param {string} dropLocation to get launch keys from
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.getLaunchKeys = function getLaunchKeys(dropLocation, next) {
  let deferred = new Q.defer()    
    , url = this.launchKeysUrl + '?dropLocation=' + encodeURIComponent(dropLocation);
    
    this.assignGetRequest(url, deferred);
  
  return deferred.promise.nodeify(next)
};


RingtailClient.prototype.getLitKeys = function getLitKeys(connectionString, dropLocation, next) {
  let deferred = new Q.defer()    
    , url = this.launchKeysUrl + '?connectionString=' + encodeURIComponent(connectionString) + '&dropLocation=' + dropLocation;
  
  this.assignGetRequest(url, deferred);
  
  return deferred.promise.nodeify(next)
};


/**
 * Start an installation
 *
 * @return {promise}
 */ 
RingtailClient.prototype.install = function install(next) {
  let deferred = new Q.defer();
    
  this.assignGetRequest(this.installUrl, deferred);
  
  return deferred.promise.nodeify(next);
};


/**
 * Start a retry
 *
 * @return {promise}
 */ 
RingtailClient.prototype.retry = function retry(next) {
  let deferred = new Q.defer();
    
  this.assignGetRequest(this.retryUrl, deferred);

  return deferred.promise.nodeify(next);
};


/**
 * Start a validation job
 *
 * @return {promise}
 */ 
RingtailClient.prototype.validate = function validate(next) {
  let deferred = new Q.defer();

  this.assignGetRequest(this.installDiagnositcUrl, deferred);

  return deferred.promise.nodeify(next);
};


/**
 * Triggers an autoupdate of the service from the update
 * drop location that the service is configured to use
 *
 * @param {function} [next] callback function
 * @return {promise} 
 */
RingtailClient.prototype.update = function update(next) {
  var delay = this.updateDelay
    , deferred = Q.defer()
    , requestOptions = this.getRequestOptions(this.updateUrl);

  setTimeout(function() {
    request.get(requestOptions, function(err, res, body) {
      setTimeout(function() {
        if(err) deferred.reject(err);
        else deferred.resolve(body);
      }, delay);      
    });  
  }, delay);  

  return deferred.promise.nodeify(next);
};


/**
 * Changes the drop location that the service is configured to use
 *
 * @param {string} [value] the new path
 * @param {function} [next] callback function
 * @return {promise} 
 */
RingtailClient.prototype.setUpdatePath = function setUpdatePath(value, next) {
  var deferred = new Q.defer()    
    , updateUrl = this.updateUrl
    , normalizedValue = value.replace(/['"]+/g, '')
    , url = updateUrl + '?value=' + normalizedValue
    , resolveFn = function(body, resolveOut){
        resolveOut.Val = configParser.parse(body);
    };

  this.assignGetRequest(url, deferred, resolveFn);

  return deferred.promise.nodeify(next); 
};


/**
 * Set username and password for running the service
 *
 * @param {object} [credentials] the credentials
 * @return {promise}
 */
RingtailClient.prototype.setMasterCredentials = function setMasterCredentials(credentials, next) {
  var deferred = new Q.defer()    
    , url = this.setMasterConfigUrl
    , options = Object.assign({}, {method:'POST', json: credentials}, this.getRequestOptions(url));

    debug('updating master credentials');
    
    request.post(options, function(err, response, body) {
      if(response && response.statusCode === 200) {
        deferred.resolve(body);
      } else if(err) {
        deferred.reject(err);
      } else {
        deferred.reject(response);
      }
    });

    return deferred.promise.nodeify(next);
};


RingtailClient.prototype.setDeploymentConfig = function setDeploymentConfig(config, next) {
  var deferred = new Q.defer()    
    , url = this.setDeploymentConfigUrl
    , options = Object.assign({}, {method:'POST', json: config}, this.getRequestOptions(url));

    debug('setting deployment config');

    request.post(options, function(err, response, body) {
      if(response && response.statusCode === 200) {
        deferred.resolve(body);
      } else if(err) {
        deferred.reject(err);
      } else {
        deferred.reject(response);
      }
    });

    return deferred.promise.nodeify(next);
};


/**
 * Gets the build status from the install service
 *
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.status = function status(next) {
  var deferred = Q.defer();

  this.assignGetRequest(this.statusUrl, deferred);

  return deferred.promise.nodeify(next); 
};


/**
 * Gets the validation output from the install service
 *
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.installDiagnositcResult = function installDiagnositcResult(next) {
  var deferred = Q.defer();

  this.assignGetRequest(this.installDiagnositcResultUrl, deferred);

  return deferred.promise.nodeify(next); 
};


/**
 * Gets the build information from the install service
 * 
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.installed = function installed(next) {
  let deferred = Q.defer()    
    , resolveFn = function(body, resolveOut){
        resolveOut.Val = htmlParser.createArray(body);
    };

  this.assignGetRequest(this.installedUrl, deferred, resolveFn);

  return deferred.promise.nodeify(next); 
};


/** 
 * Utility function that waits until the service is available
 * 
 * @param {function} status status callback function
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.waitForService = function waitForService( next) { 
  var pollInterval = this.pollInterval
    , waitTimeout  = this.waitTimeout
    , me = this
    , fn 
    ;

  fn = function() {  
    return me.status();
  };

  return poll.until
    .fulfilled(fn, pollInterval, waitTimeout)
    .nodeify(next);
};


/** 
 * Utility function that waits until the service is available
 * 
 * @param {function} status status callback function
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.waitForServiceLimited = function waitForServiceLimited(waitTime, next) { 
  var pollInterval = this.pollIntervalDiagnostic
    , waitTimeout  = waitTime ? waitTime : this.waitTimeout
    , me = this
    , fn 
    ;

  fn = function() {  
    return me.status();
  };

  return poll.until
    .fulfilled(fn, pollInterval, waitTimeout)
    .nodeify(next);
};


RingtailClient.prototype.isJobRunning = function isJobRunning(next) {
  // If there's no endpoint for this on the server or an error, return a green light
  // In short, false is actually passing the validation check that calls this function.
  let requestOptions = this.getRequestOptions(this.isRunningUrl)
    , deferred = Q.defer()
    ;

  request.get(requestOptions, function(err, response, body) {
    if(response && response.statusCode === 200) {
      let requestResponse = (body === 'true');
      deferred.resolve(requestResponse);
    } 
    else if(err) {
      // Have to fail open in case the other end doesn't have the API yet.
      deferred.resolve(false);
    }
    else {
      // Have to fail open in case the other end doesn't have the API yet.
      deferred.resolve(false);
    }
  });
      
  return deferred.promise.nodeify(next);
};


/**
 * Gets the storage information from the install service
 * 
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.prerequisites = function installed(next) {
  let deferred = Q.defer();
  
  this.assignGetRequest(this.preReqUrl, deferred);

  return deferred.promise.nodeify(next); 
};


/**
 * Utility function that waits for an install to complete. Note you
 * must initialize the installation in a prior call. This
 *
 */
RingtailClient.prototype.waitForInstall = function waitForInstall(status, next) {
  var pollInterval    = this.pollInterval
    , waitTimeout     = this.installTimeout
    , installDelay    = this.installDelay
    , me              = this
    , fn 
    ;

  fn = function() {  
    var deferred = Q.defer();
    me.status(function(err, body) {
      if(err) {
        deferred.reject(err);
      } else {

        // execute status update
        if(status) {
          status(body);
        }
        
        // check for success / completion
        if(body.indexOf('UPGRADE COMPLETE') >= 0 || body.indexOf('UPGRADE SUCCESSFUL') >= 0) {      
          deferred.resolve({ status: true, body: body });
        } 
        // check for retry
        else if (body.indexOf('UPGRADE RETRY') >= 0) {
          deferred.resolve({ status: true, body: body });
        }
        // check for failure / abort
        else if (body.indexOf('UPGRADE FAILED') >= 0 || body.indexOf('UPGRADE ABORTED') >= 0) {
          deferred.resolve({ status: false, body: body });
        }

        // we're still waiting...
        else {
          deferred.reject(body);
        }
      }
    });
    return deferred.promise;
  };

        
  return Q
    // delay installation polling to allow cleanup to work
    .fcall(function() {
      var deferred = new Q.defer();
      setTimeout(deferred.resolve, installDelay);
      return deferred.promise;
    })
    // wait for install completion
    .then(function() {
      return poll.until.fulfilled(fn, pollInterval, waitTimeout);
    })
    // respond with completed body
    .then(function(status) {
      if(status.status) {
        return status.body;
      } else {
        throw new Error(status.body);
      }
    })
    .nodeify(next);
};

/**
 * Utility function that waits for an install to complete. Note you
 * must initialize the installation in a prior call. This
 *
 */
RingtailClient.prototype.waitForValidate = function waitForValidate(status, next) {
  var pollInterval    = this.pollIntervalDiagnostic
    , waitTimeout     = this.installDiagnosticTimeout
    , installDelay    = this.installDiagnosticDelay
    , me              = this
    , fn 
    ;

  fn = function() {  
    var deferred = Q.defer();
    me.installDiagnositcResult(function(err, body) {
      if(err) {
        deferred.reject(err);
      } else {

        // execute status update
        if(status) {
          status(body);
        }
       
        // check for success / completion
        if(body.indexOf('UPGRADE COMPLETE') >= 0 || body.indexOf('UPGRADE SUCCESSFUL') >= 0) {      
          deferred.resolve({ status: true, body: body });
        } 
        // check for failure / abort
        else if (body.indexOf('UPGRADE ABORTED') >= 0) {
          deferred.resolve({ status: false, body: body });
        }
        // check for failure / abort
        else if (body.indexOf('UPGRADE RETRY') >= 0) {
          deferred.resolve({ status: false, body: body });
        }
        // check for failure
        else if (body.indexOf('master.exe FAILED') >= 0) {
          deferred.resolve({ status: false, body: body });
        }
        // check for failure
        else if (body.indexOf('Validation FAILED') >= 0) {
          deferred.resolve({ status: false, body: body });
        }        
        // we're still waiting...
        else {
          deferred.reject(body);
        }
      }
    });
    return deferred.promise;
  };

        
  return Q
    // delay installation polling to allow cleanup to work
    .fcall(function() {
      var deferred = new Q.defer();
      setTimeout(deferred.resolve, installDelay);
      return deferred.promise;
    })
    // wait for install completion
    .then(function() {
      return poll.until.fulfilled(fn, pollInterval, waitTimeout);
    })
    // respond with completed body
    .then(function(status) {
      if(status.status) {
        return status.body;
      } else {
        throw new Error(status.body);
      }
    })
    .nodeify(next);
};
