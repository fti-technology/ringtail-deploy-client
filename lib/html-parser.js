
/**
 * Creates an array from the lines
 * in services output HTML file delimited by <p> tags
 *
 * @param {string} body
 * @return {array} lines in the body
 */
exports.createArray = function createArray(body) {
  var result = body.replace(/"/g, '');
  result = result.replace(/<p\>/g, '');
  result = result.replace(/<\/p\>/g, '\n');
  result = result.split('\n');
  result.splice(result.length - 1); // remove empty string at end
  return result;
};