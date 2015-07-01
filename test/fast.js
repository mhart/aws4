require('should')
var fs     = require('fs'),
    aws4   = require('../'),
    cred   = {accessKeyId: 'ABCDEF', secretAccessKey: 'abcdef1234567890'},
    date   = 'Wed, 26 Dec 2012 06:10:30 GMT',
    iso    = '20121226T061030Z',
    auth   = 'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/us-east-1/sqs/aws4_request, ' +
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
      signer.request.headers.Date = date
      signer.sign().headers.Authorization.should.equal(auth)
    })
  })

  describe('#sign() with no credentials', function() {
    it('should use process.env values', function() {
      var opts = aws4.sign({service: 'sqs', headers: {Date: date}})
      opts.headers.Authorization.should.equal(auth)
    })
  })

  describe('#sign() with credentials', function() {
    it('should use passed in values', function() {
      var cred = {accessKeyId: 'A', secretAccessKey: 'B'},
          opts = aws4.sign({service: 'sqs', headers: {Date: date}}, cred)
      opts.headers.Authorization.should.equal(
        'AWS4-HMAC-SHA256 Credential=A/20121226/us-east-1/sqs/aws4_request, ' +
        'SignedHeaders=date;host;x-amz-date, ' +
        'Signature=5d8d587b6e3011935837d670e682646012977960d8a8d992503d852726af71b9')
    })
  })

  describe('#sign() with no host or region', function() {
    it('should add hostname and default region', function() {
      var opts = aws4.sign({service: 'sqs'})
      opts.hostname.should.equal('sqs.us-east-1.amazonaws.com')
      opts.headers.Host.should.equal('sqs.us-east-1.amazonaws.com')
    })
    it('should add hostname and no region if service is regionless', function() {
      var opts = aws4.sign({service: 'iam'})
      opts.hostname.should.equal('iam.amazonaws.com')
      opts.headers.Host.should.equal('iam.amazonaws.com')
    })
    it('should add hostname and no region if s3 and us-east-1', function() {
      var opts = aws4.sign({service: 's3'})
      opts.hostname.should.equal('s3.amazonaws.com')
      opts.headers.Host.should.equal('s3.amazonaws.com')
    })
    it('should add hostname and no region if sdb and us-east-1', function() {
      var opts = aws4.sign({service: 'sdb'})
      opts.hostname.should.equal('sdb.amazonaws.com')
      opts.headers.Host.should.equal('sdb.amazonaws.com')
    })
    it('should populate AWS headers correctly', function() {
      var opts = aws4.sign({service: 'sqs', headers: {Date: date}})
      opts.headers['X-Amz-Date'].should.equal(iso)
      opts.headers.Authorization.should.equal(auth)
    })
  })

  describe('#sign() with no host, but with region', function() {
    it('should add correct hostname for regular services', function() {
      var opts = aws4.sign({service: 'glacier', region: 'us-west-1'})
      opts.hostname.should.equal('glacier.us-west-1.amazonaws.com')
      opts.headers.Host.should.equal('glacier.us-west-1.amazonaws.com')
    })
    it('should add correct hostname for s3', function() {
      var opts = aws4.sign({service: 's3', region: 'us-west-1'})
      opts.hostname.should.equal('s3-us-west-1.amazonaws.com')
      opts.headers.Host.should.equal('s3-us-west-1.amazonaws.com')
    })
    it('should add correct hostname for ses', function() {
      var opts = aws4.sign({service: 'ses', region: 'us-west-1'})
      opts.hostname.should.equal('email.us-west-1.amazonaws.com')
      opts.headers.Host.should.equal('email.us-west-1.amazonaws.com')
    })
  })

  describe('#sign() with hostname', function() {
    it('should populate AWS headers correctly', function() {
      var opts = aws4.sign({hostname: 'sqs.us-east-1.amazonaws.com', headers: {Date: date}})
      opts.headers['X-Amz-Date'].should.equal(iso)
      opts.headers.Authorization.should.equal(auth)
    })
  })

  describe('#sign() with host', function() {
    it('should populate AWS headers correctly', function() {
      var opts = aws4.sign({host: 'sqs.us-east-1.amazonaws.com', headers: {Date: date}})
      opts.headers['X-Amz-Date'].should.equal(iso)
      opts.headers.Authorization.should.equal(auth)
    })
  })

  describe('#sign() with body', function() {
    it('should use POST', function() {
      var opts = aws4.sign({body: 'SomeAction'})
      opts.method.should.equal('POST')
    })
    it('should set Content-Type', function() {
      var opts = aws4.sign({body: 'SomeAction'})
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
      opts.headers.Authorization.should.equal(
        'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/ap-southeast-2/dynamodb/aws4_request, ' +
        'SignedHeaders=content-length;content-type;date;host;x-amz-date;x-amz-target, ' +
        'Signature=f9a00417d284dfe2cfdef809652c1d54add4e159835a0c69ac8cbdaa227a5000')
    })
  })

  describe('#sign() with signQuery', function() {
    it('should work with standard services', function() {
      var opts = aws4.sign({
        service: 'dynamodb',
        path: '/?X-Amz-Date=' + iso,
        headers: {
          'Content-Type': 'application/x-amz-json-1.0',
          'X-Amz-Target': 'DynamoDB_20120810.ListTables',
        },
        body: '{}',
        signQuery: true,
      })
      opts.path.should.equal(
        '/?X-Amz-Date=20121226T061030Z&X-Amz-Algorithm=AWS4-HMAC-SHA256&' +
        'X-Amz-Credential=ABCDEF%2F20121226%2Fus-east-1%2Fdynamodb%2Faws4_request&' +
        'X-Amz-SignedHeaders=content-type%3Bhost%3Bx-amz-target&' +
        'X-Amz-Signature=3529a3f866ef85935692c2f2f6e8edb67de2ec91ce79ba5f1dbe28fc66cb154e')
    })
    it('should work with s3', function() {
      var opts = aws4.sign({
        service: 's3',
        path: '/some-bucket?X-Amz-Date=' + iso,
        signQuery: true,
      })
      opts.path.should.equal(
        '/some-bucket?X-Amz-Date=20121226T061030Z&X-Amz-Expires=86400&X-Amz-Algorithm=AWS4-HMAC-SHA256&' +
        'X-Amz-Credential=ABCDEF%2F20121226%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-SignedHeaders=host&' +
        'X-Amz-Signature=1acb058aaf5ce6ea6125f03231ab2b64acc9ce05fd70e4c7f087515adc41814a')
    })
    it('should adhere to RFC-3986', function() {
      var opts = aws4.sign({
        service: 's3',
        path: '/some-bucket?a=!\'&b=()*&X-Amz-Date=' + iso,
        signQuery: true,
      })
      opts.path.should.equal(
        '/some-bucket?a=!\'&b=()*&X-Amz-Date=20121226T061030Z&X-Amz-Expires=86400&X-Amz-Algorithm=AWS4-HMAC-SHA256&' +
        'X-Amz-Credential=ABCDEF%2F20121226%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-SignedHeaders=host' +
        '&X-Amz-Signature=5f3e8e3406e27471183900f8ee891a6ae40e959c05394b4271a2b5b543d5a14a')
    })
  })

  describe('with AWS test suite', function() {
    var CREDENTIALS = {
      accessKeyId: 'AKIDEXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY'
    }
    var SERVICE = 'host'

    var tests = fs.readdirSync(__dirname + '/fixtures')
      .map(function(name) { return (name.match(/^(.+)\.authz/) || [])[1] })
      .filter(Boolean)

    tests.forEach(function(test) {

      it('should pass ' + test, function() {
        var request = fs.readFileSync(__dirname + '/fixtures/' + test + '.req', 'utf8').replace(/\r/g, '')
        var canonicalString = fs.readFileSync(__dirname + '/fixtures/' + test + '.creq', 'utf8').replace(/\r/g, '')
        var stringToSign = fs.readFileSync(__dirname + '/fixtures/' + test + '.sts', 'utf8').replace(/\r/g, '')
        var outputAuth = fs.readFileSync(__dirname + '/fixtures/' + test + '.authz', 'utf8').replace(/\r/g, '')

        var reqLines = request.split('\n')
        var req = reqLines[0].split(' ')
        var method = req[0]
        var path = req[1]
        var headers = {}
        for (var i = 1; i < reqLines.length; i++) {
          if (!reqLines[i]) break
          var colonIx = reqLines[i].indexOf(':')
          var header = reqLines[i].slice(0, colonIx).toLowerCase()
          var value = reqLines[i].slice(colonIx + 1)
          if (headers[header]) {
            headers[header] = headers[header].split(',')
            headers[header].push(value)
            headers[header] = headers[header].sort().join(',')
          } else {
            headers[header] = value
          }
        }
        var body = reqLines.slice(i + 1).join('\n')

        var signer = new (aws4.RequestSigner)({
          service: SERVICE,
          method: method,
          path: path,
          headers: headers,
          body: body,
          doNotModifyHeaders: true,
        }, CREDENTIALS)

        signer.canonicalString().should.equal(canonicalString)
        signer.stringToSign().should.equal(stringToSign)
        signer.sign().headers.Authorization.should.equal(outputAuth)
      })

    })
  })
})

