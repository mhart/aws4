var should = require('should')
  , aws4   = require('../')

describe('aws4', function() {
  describe('#sign() with no host or region', function() {
    var opts = aws4.sign({ service: 'sqs' })
    it('should add hostname and default region', function() {
      opts.hostname.should.equal('sqs.us-east-1.amazonaws.com')
      opts.headers['Host'].should.equal('sqs.us-east-1.amazonaws.com')
    })
    it('should populate AWS headers', function() {
      opts.headers['X-Amz-Date'].should.not.be.empty
      opts.headers['Authorization'].should.not.be.empty
    })
  })
})
