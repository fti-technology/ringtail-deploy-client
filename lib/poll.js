var debug = require('debug')('poll')
  , Q = require('q')
  ;

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
    debug('polling');
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
          deferred.reject('Timeout of ' + timeout + 'ms exceeded');
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