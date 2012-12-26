var should = require('should')
  , aws4   = require('../')
  , cred   = { accessKeyId: 'ABCDEF', secretAccessKey: 'abcdef1234567890' }
  , date   = 'Wed, 26 Dec 2012 06:10:30 GMT'
  , iso    = '20121226T061030Z'
  , auth   = 'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/us-east-1/sqs/aws4_request, ' +
             'SignedHeaders=date;host;x-amz-date, ' +
             'Signature=d847efb54cd60f0a256174848f26e43af4b5168dbec3118dc9fd84e942285791'

describe('aws4', function() {

  // Ensure we restore process.env in case a test modifies it
  var env = {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY
  }
  after(function() {
    process.env.AWS_ACCESS_KEY_ID = env.AWS_ACCESS_KEY_ID
    process.env.AWS_SECRET_ACCESS_KEY = env.AWS_SECRET_ACCESS_KEY
  })

  describe('#sign() with no host or region', function() {
    var opts = aws4.sign({ service: 'sqs', headers: { Date: date } }, cred)
    it('should add hostname and default region', function() {
      opts.hostname.should.equal('sqs.us-east-1.amazonaws.com')
      opts.headers['Host'].should.equal('sqs.us-east-1.amazonaws.com')
    })
    it('should populate AWS headers correctly', function() {
      opts.headers['X-Amz-Date'].should.equal(iso)
      opts.headers['Authorization'].should.equal(auth)
    })
  })

  describe('#sign() with no host, but with region', function() {
    var opts = aws4.sign({ service: 'glacier', region: 'us-west-1' }, cred)
    it('should add correct hostname', function() {
      opts.hostname.should.equal('glacier.us-west-1.amazonaws.com')
      opts.headers['Host'].should.equal('glacier.us-west-1.amazonaws.com')
    })
  })

  describe('#sign() with hostname', function() {
    var opts = aws4.sign({ hostname: 'sqs.us-east-1.amazonaws.com', headers: { Date: date } }, cred)
    it('should populate AWS headers correctly', function() {
      opts.headers['X-Amz-Date'].should.equal(iso)
      opts.headers['Authorization'].should.equal(auth)
    })
  })

  describe('#sign() with host', function() {
    var opts = aws4.sign({ host: 'sqs.us-east-1.amazonaws.com', headers: { Date: date } }, cred)
    it('should populate AWS headers correctly', function() {
      opts.headers['X-Amz-Date'].should.equal(iso)
      opts.headers['Authorization'].should.equal(auth)
    })
  })

  describe('#sign() with body', function() {
    var opts = aws4.sign({ body: 'SomeAction' }, cred)
    it('should use POST', function() {
      opts.method.should.equal('POST')
    })
    it('should set Content-Type', function() {
      opts.headers['Content-Type'].should.equal('application/x-www-form-urlencoded')
    })
  })

  describe('#sign() with no credentials', function() {
    process.env.AWS_ACCESS_KEY_ID = cred.accessKeyId
    process.env.AWS_SECRET_ACCESS_KEY = cred.secretAccessKey
    var opts = aws4.sign({ service: 'sqs', headers: { Date: date } })
    it('should use process.env values', function() {
      opts.headers['Authorization'].should.equal(auth)
    })
  })

  describe('#sign() with many different options', function() {
    var opts = aws4.sign({
      service: 'dynamodb',
      region: 'ap-southeast-2',
      method: 'DELETE',
      path: '/Some/Path?param=key&param=otherKey',
      body: 'SomeAction=SomeThing&Whatever=SomeThingElse',
      headers: {
        Date: date,
        'Content-Type': 'application/x-amz-json-1.0',
        'X-Amz-Target': 'DynamoDB_20111205.ListTables'
      }
    }, cred)
    it('should populate AWS headers correctly', function() {
      opts.headers['X-Amz-Date'].should.equal(iso)
      opts.headers['Authorization'].should.equal(
        'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/ap-southeast-2/dynamodb/aws4_request, ' +
        'SignedHeaders=content-type;date;host;x-amz-date;x-amz-target, ' +
        'Signature=a5520eb980625ab21058d3df3576f56b412f2999711a48b6273e8eeb084caa7b')
    })
  })

})

