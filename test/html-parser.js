var Q       = require('q')
  , mocha   = require('mocha')
  , sinon   = require('sinon')
  , chai    = require('chai')
  , expect  = chai.expect
  ;

describe('html-parser', function() {
  var htmlParser = require('../lib/html-parser');


  describe('.createArray', function() {
    it('should convert paragraphs to an array of lines', function() {
      var input   = '"<p>Builds:</p><p>SomeBuild1</p><p>SomeBuild2</p>"'
        , result  = htmlParser.createArray(input)
        ;
      expect(result.length).to.equal(3);
      expect(result[0]).to.equal('Builds:');
    });
  });
});