var {LruMap} = require('thingies/lib/LruMap')

module.exports = function(size) {
  return new LruMap(size)
}
