var Q = require('q');

/**
 * Retries execution of a function that returns a promise until
 * the promise is fulfilled. If the promise is rejected it will retry
 * execution as long as the timeout threshold has not been reached.
 * 
 * @param {Function} fn - function that returns a promise
 * @param {Number} [interval] - polling interval in MS
 * @param {Number} [timeout] - timeout interval in MS
 * @returns {Promise}
 */

function fulfilled(fn, interval, timeout) {    
    var deferred = Q.defer()
      , start = new Date()
      ;

    interval = interval || 15000;
    timeout = timeout || 60000;  

    function poll() {
      fn()
      .then(function(value) {
        deferred.resolve(value);
      })
      .fail(function(err) {
        if(new Date() - start > timeout) {
          let response = 'Timeout of ' + timeout + 'ms exceeded. ';
          response += 'Job may still be running on the remote machine. You may reboot and try again or ';
          response += 'login to the server and debug the issue from the logs.';
          deferred.reject(response);
        } else {
          setTimeout(poll, interval);
        }
      });
    }

  poll();
  return deferred.promise;
}


module.exports = {
  until: { 
    fulfilled: fulfilled    
  }
};