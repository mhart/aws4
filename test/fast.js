var should = require('should')
  , aws4   = require('../')
  , cred   = { accessKeyId: 'ABCDEF', secretAccessKey: 'abcdef1234567890' }
  , date   = 'Wed, 26 Dec 2012 06:10:30 GMT'
  , iso    = '20121226T061030Z'
  , auth   = 'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/us-east-1/sqs/aws4_request, ' +
             'SignedHeaders=date;host;x-amz-date, ' +
             'Signature=d847efb54cd60f0a256174848f26e43af4b5168dbec3118dc9fd84e942285791'

describe('aws4', function() {

  // Save and ensure we restore process.env
  var envAccessKeyId, envSecretAccessKey

  before(function() {
    envAccessKeyId = process.env.AWS_ACCESS_KEY_ID
    envSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    process.env.AWS_ACCESS_KEY_ID = cred.accessKeyId
    process.env.AWS_SECRET_ACCESS_KEY = cred.secretAccessKey
  })

  after(function() {
    process.env.AWS_ACCESS_KEY_ID = envAccessKeyId
    process.env.AWS_SECRET_ACCESS_KEY = envSecretAccessKey
  })

  describe('#sign() when constructed with string url', function() {
    it('should parse into request correctly', function() {
      var signer = new aws4.RequestSigner('http://sqs.us-east-1.amazonaws.com/')
      signer.request.headers = { Date: date }
      signer.sign().headers['Authorization'].should.equal(auth)
    })
  })

  describe('#sign() with no credentials', function() {
    it('should use process.env values', function() {
      var opts = aws4.sign({ service: 'sqs', headers: { Date: date } })
      opts.headers['Authorization'].should.equal(auth)
    })
  })

  describe('#sign() with credentials', function() {
    it('should use passed in values', function() {
      var cred = { accessKeyId: 'A', secretAccessKey: 'B' }
        , opts = aws4.sign({ service: 'sqs', headers: { Date: date } }, cred)
      opts.headers['Authorization'].should.equal(
        'AWS4-HMAC-SHA256 Credential=A/20121226/us-east-1/sqs/aws4_request, ' +
        'SignedHeaders=date;host;x-amz-date, ' +
        'Signature=5d8d587b6e3011935837d670e682646012977960d8a8d992503d852726af71b9')
    })
  })

  describe('#sign() with no host or region', function() {
    it('should add hostname and default region', function() {
      var opts = aws4.sign({ service: 'sqs' })
      opts.hostname.should.equal('sqs.us-east-1.amazonaws.com')
      opts.headers['Host'].should.equal('sqs.us-east-1.amazonaws.com')
    })
    it('should add hostname and no region if service is regionless', function() {
      var opts = aws4.sign({ service: 'iam' })
      opts.hostname.should.equal('iam.amazonaws.com')
      opts.headers['Host'].should.equal('iam.amazonaws.com')
    })
    it('should populate AWS headers correctly', function() {
      var opts = aws4.sign({ service: 'sqs', headers: { Date: date } })
      opts.headers['X-Amz-Date'].should.equal(iso)
      opts.headers['Authorization'].should.equal(auth)
    })
  })

  describe('#sign() with no host, but with region', function() {
    it('should add correct hostname', function() {
      var opts = aws4.sign({ service: 'glacier', region: 'us-west-1' })
      opts.hostname.should.equal('glacier.us-west-1.amazonaws.com')
      opts.headers['Host'].should.equal('glacier.us-west-1.amazonaws.com')
    })
  })

  describe('#sign() with hostname', function() {
    it('should populate AWS headers correctly', function() {
      var opts = aws4.sign({ hostname: 'sqs.us-east-1.amazonaws.com', headers: { Date: date } })
      opts.headers['X-Amz-Date'].should.equal(iso)
      opts.headers['Authorization'].should.equal(auth)
    })
  })

  describe('#sign() with host', function() {
    it('should populate AWS headers correctly', function() {
      var opts = aws4.sign({ host: 'sqs.us-east-1.amazonaws.com', headers: { Date: date } })
      opts.headers['X-Amz-Date'].should.equal(iso)
      opts.headers['Authorization'].should.equal(auth)
    })
  })

  describe('#sign() with body', function() {
    it('should use POST', function() {
      var opts = aws4.sign({ body: 'SomeAction' })
      opts.method.should.equal('POST')
    })
    it('should set Content-Type', function() {
      var opts = aws4.sign({ body: 'SomeAction' })
      opts.headers['Content-Type'].should.equal('application/x-www-form-urlencoded; charset=utf-8')
    })
  })

  describe('#sign() with many different options', function() {
    it('should populate AWS headers correctly', function() {
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
      })
      opts.headers['X-Amz-Date'].should.equal(iso)
      opts.headers['Authorization'].should.equal(
        'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/ap-southeast-2/dynamodb/aws4_request, ' +
        'SignedHeaders=content-length;content-type;date;host;x-amz-date;x-amz-target, ' +
        'Signature=f9a00417d284dfe2cfdef809652c1d54add4e159835a0c69ac8cbdaa227a5000')
    })
  })

})

