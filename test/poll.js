var Q       = require('q')
  , mocha   = require('mocha')
  , sinon   = require('sinon')
  , chai    = require('chai')
  , expect  = chai.expect
  ;

describe('poll', function() {
  var poll = require('../lib/poll');

  describe('.until', function() {

    describe('.fulfilled', function() {
      var fn;

      beforeEach(function() {
        fn = sinon.stub();
      });

      it('should execute function until fulfilled', function(done) {
        fn.onCall(0).returns(Q.reject());
        fn.onCall(1).returns(Q.reject());        
        fn.onCall(2).returns(Q.resolve());

        poll.until.fulfilled(fn, 1)
        .then(function() {
          expect(fn.callCount).to.equal(3);
          done();
        })
        .fail(done);
      });

      it('should resolve to the fulfilled value', function(done) {
        var value = 1;
        fn.onCall(0).returns(Q.resolve(value));

        poll.until.fulfilled(fn, 1)
        .then(function(val) {
          expect(val).to.equal(value);
          done();
        })
        .fail(done);
      });

      it('should reject after timeout', function(done) {
        fn.onCall(0).returns(Q.reject());
        fn.onCall(1).returns(Q.reject());      

        poll.until.fulfilled(fn, 5, 1)
        .then(function() {
          throw new Error('Should have timed out');
        })
        .fail(function(err) {
          var hasError = err.indexOf('Timeout') >= 0;
          expect(hasError).to.be.true;
          done();
        })        
        .fail(done);
      });

    });

  });
});