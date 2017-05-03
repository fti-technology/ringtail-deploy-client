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

  this.installUrl    = 'http://' + this.serviceHost + ':8080/api/installer';
  this.installDiagnositcUrl    = 'http://' + this.serviceHost + ':8080/api/installDiagnostic';
  this.installDiagnositcResultUrl    = 'http://' + this.serviceHost + ':8080/api/config?filename=masterLog.txt';
  this.statusUrl     = 'http://' + this.serviceHost + ':8080/api/status';
  this.isUpUrl       = 'http://' + this.serviceHost + ':8080/api/help';
  this.updateUrl     = 'http://' + this.serviceHost + ':8080/api/UpdateInstallerService';
  this.configUrl     = 'http://' + this.serviceHost + ':8080/api/config';
  this.installedUrl  = 'http://' + this.serviceHost + ':8080/api/installedBuilds';
  this.launchKeysUrl = 'http://' + this.serviceHost + ':8080/api/AvailableFeatures';
  this.retryUrl      = 'http://' + this.serviceHost + ':8080/api/retry';
  this.preReqUrl     = 'http://' + this.serviceHost + ':8080/api/Prerequisite?minGB=7';

  this.pollInterval             = 15 * 1000;    // 15 seconds
  this.requestTimeout           = 10 * 1000;    // 10 seconds
  this.installDelay             = 15 * 1000;    // 15 seconds
  this.waitTimeout              = 600 * 1000;   // 10 minutes
  this.updateDelay              = 15 * 1000;    // 15 seconds
  this.installTimeout           = 4500 * 1000;  // 75 minutes
  this.installDiagnosticTimeout = 90 * 1000;    // 90 seconds
  this.installDiagnosticDelay   = 6 * 1000;     // 6 seconds
  this.pollIntervalDiagnostic   = 5 * 1000;     // 5 seconds
}

module.exports = RingtailClient;



/**
 * Sets the config value
 * 
 * @param {string} key to set
 * @param {string} value to set
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.setConfig = function setConfig(key, value, next) {
  var deferred = new Q.defer()    
    , configUrl = this.configUrl
    , url;
  
  url = configUrl + '?key=' + encodeURIComponent(key) + '&value=' + encodeURIComponent(value);  
  request.get(url, function(err, response, body) {   
    if(response && response.statusCode === 200) {    
      // validate that config was set correctly
      var config = configParser.parse(body);
      /* jshint es5:false */
      /* jshint eqeqeq:false */
      if(config[key] && config[key].value != value) {
        deferred.reject('Config value not set correctly: \'' + config[key].value + '\' expected to be \'' + value + '\'');
      } else {
        deferred.resolve(value);
      }
      /*jshint eqeqeq:true*/
    } else if(err) {
      deferred.reject(err);
    } else {
      deferred.reject(response);
    }      
  });

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
  var deferred = new Q.defer()    
    , configUrl = this.configUrl
    , url;
    
  request.get(configUrl, function(err, response, body) {
    if(response && response.status === 200) {
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
 * Gets the launch keys for a build
 * 
 * @param {string} dropLocation to get launch keys from
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.getLaunchKeys = function getLaunchKeys(dropLocation, next) {
  var deferred = new Q.defer()    
    , launchKeysUrl = this.launchKeysUrl
    , url;
  
  url = launchKeysUrl + '?dropLocation=' + encodeURIComponent(dropLocation);
  request.get(url, function(err, response, body) {   
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

RingtailClient.prototype.getLitKeys = function getLitKeys(connectionString, dropLocation, next) {
  var deferred = new Q.defer()    
    , launchKeysUrl = this.launchKeysUrl
    , url;
  
  url = launchKeysUrl + '?connectionString=' + encodeURIComponent(connectionString) + '&dropLocation=' + dropLocation;
  request.get(url, function(err, response, body) {   
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
 * Start an installation
 *
 * @return {promise}
 */ 
RingtailClient.prototype.install = function install(next) {
  var deferred = new Q.defer()    
    , installUrl = this.installUrl    
    ;

  request.get(installUrl, function(err, response, body) {
    deferred.resolve(body);
  }); 

  return deferred.promise.nodeify(next);
};


/**
 * Start a retry
 *
 * @return {promise}
 */ 
RingtailClient.prototype.retry = function retry(next) {
  var deferred = new Q.defer()    
    , retryUrl = this.retryUrl    
    ;

  request.get(retryUrl, function(err, response, body) {
    deferred.resolve(body);
  }); 

  return deferred.promise.nodeify(next);
};


/**
 * Start a validation job
 *
 * @return {promise}
 */ 
RingtailClient.prototype.validate = function validate(next) {
  var deferred = new Q.defer()    
    , installDiagnositcUrl = this.installDiagnositcUrl    
    ;

  request.get(installDiagnositcUrl, function(err, response, body) {
    deferred.resolve(body);
  }); 

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
  var updateUrl = this.updateUrl
    , delay = this.updateDelay
    , deferred = Q.defer();

  setTimeout(function() {
    request.get(updateUrl, function(err, res, body) {
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
    , url = updateUrl + '?value=' + normalizedValue;


  debug('setting url %s', url);

  request.get(url, function(err, response, body) {   
    if(response && response.statusCode === 200) {    
      // validate that config was set correctly
      var config = configParser.parse(body);
      deferred.resolve(value);
      /*jshint eqeqeq:true*/
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
  var statusUrl = this.statusUrl    
    , requestTimeout = this.requestTimeout
    , deferred = Q.defer()
    ;

  request.get({ url: statusUrl, timeout: requestTimeout }, function(err, response, body) {    
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
 * Gets the validation output from the install service
 *
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.installDiagnositcResult = function installDiagnositcResult(next) {
  var statusUrl = this.installDiagnositcResultUrl    
    , requestTimeout = this.requestTimeout
    , deferred = Q.defer()
    ;

  request.get({ url: statusUrl, timeout: requestTimeout }, function(err, response, body) {    
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
 * Gets the build information from the install service
 * 
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.installed = function installed(next) {
  var installedUrl = this.installedUrl    
    , requestTimeout = this.requestTimeout
    , deferred = Q.defer()    
    ;

  request.get({ url: installedUrl, timeout: requestTimeout }, function(err, response, body) {                  
    var result;
    if(response && response.statusCode === 200) {      
      result = htmlParser.createArray(body);
      deferred.resolve(result);    
    } else if(err) {
      deferred.reject(err);      
    } else {    
      deferred.reject(response);
    }
  }); 

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
  var statusUrl = this.statusUrl
    , pollInterval = this.pollInterval
    , waitTimeout  = this.waitTimeout
    , requestTimeout = this.requestTimeout
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
  var statusUrl = this.statusUrl
    , pollInterval = this.pollIntervalDiagnostic
    , waitTimeout  = waitTime ? waitTime : this.waitTimeout
    , requestTimeout = this.requestTimeout
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
 * Gets the storage information from the install service
 * 
 * @param {function} [next] callback function
 * @return {promise}
 */
RingtailClient.prototype.prerequisites = function installed(next) {
  var preReqUrl = this.preReqUrl    
    , requestTimeout = this.requestTimeout
    , deferred = Q.defer()    
    ;
  
  request.get({url: preReqUrl}, function(err, response, body) {                  
    if(response && response.statusCode === 200) {  
      deferred.resolve(body);    
    } else if(err) {
      deferred.reject(err);      
    } else {    
      deferred.resolve(body);
    }
  }); 

  return deferred.promise.nodeify(next); 
};

/**
 * Utility function that waits for an install to complete. Note you
 * must initialize the installation in a prior call. This
 *
 */
RingtailClient.prototype.waitForInstall = function waitForInstall(status, next) {
  var statusUrl       = this.statusUrl
    , pollInterval    = this.pollInterval
    , waitTimeout     = this.installTimeout
    , installDelay    = this.installDelay
    , requestTimeout  = this.requestTimeout    
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
  var statusUrl       = this.installDiagnositcResultUrl
    , pollInterval    = this.pollIntervalDiagnostic
    , waitTimeout     = this.installDiagnosticTimeout
    , installDelay    = this.installDiagnosticDelay
    , requestTimeout  = this.requestTimeout    
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
