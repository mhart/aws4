var fs = require('fs'),
    path = require('path'),
    should = require('should'),
    aws4 = require('../'),
    lru = require('../lru'),
    RequestSigner = aws4.RequestSigner,
    cred = {accessKeyId: 'ABCDEF', secretAccessKey: 'abcdef1234567890'},
    date = 'Wed, 26 Dec 2012 06:10:30 GMT',
    iso = '20121226T061030Z',
    auth = 'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/us-east-1/sqs/aws4_request, ' +
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
      var signer = new RequestSigner('http://sqs.us-east-1.amazonaws.com/')
      signer.request.headers.Date = date
      signer.sign().headers.Authorization.should.equal(auth)
    })

    it('should also support elastic search', function() {
      var signer = new RequestSigner('https://search-cluster-name-aaaaaa0aa00aa0aaaaaaa00aaa.eu-west-1.es.amazonaws.com')
      signer.request.headers.Date = date
      signer.sign().headers.Authorization.should.equal('AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/eu-west-1/es/aws4_request, SignedHeaders=date;host;x-amz-date, Signature=2dba21885bd7ccb0c5775c578c18a5c81fd30db84d4a2911933152df01de5260')
    })
  })

  describe('RequestSigner', function() {
    it('should correctly recognise ses', function() {
      var signer = new RequestSigner('https://email.us-west-2.amazonaws.com')
      signer.service.should.equal('ses')
      signer.region.should.equal('us-west-2')
    })

    it('should correctly recognise es when interacting directly with the es api', function() {
      var signer = new RequestSigner('https://search-cluster-name-aaaaaa0aa00aa0aaaaaaa00aaa.eu-west-1.es.amazonaws.com')
      signer.service.should.equal('es')
      signer.region.should.equal('eu-west-1')
    })

    it('should correctly recognise es when interacting directly with aws\'s es configuration api', function() {
      var signer = new RequestSigner('https://es.us-west-2.amazonaws.com')
      signer.service.should.equal('es')
      signer.region.should.equal('us-west-2')
    })

    it('should correctly recognise sns', function() {
      var signer = new RequestSigner('https://sns.us-west-2.amazonaws.com')
      signer.service.should.equal('sns')
      signer.region.should.equal('us-west-2')
    })

    it('should know global endpoint is us-east-1 for sdb', function() {
      var signer = new RequestSigner('https://sdb.amazonaws.com')
      signer.service.should.equal('sdb')
      signer.region.should.equal('us-east-1')
    })

    it('should not set extra headers for CodeCommit Git access', function() {
      var signer = new RequestSigner({service: 'codecommit', method: 'GIT', host: 'example.com'})
      signer.prepareRequest()
      signer.request.headers.should.deepEqual({Host: 'example.com'})
    })

    it('should not have a "Z" at end of timestamp for CodeCommit Git access', function() {
      var signer = new RequestSigner({service: 'codecommit', method: 'GIT', host: 'example.com'})
      signer.getDateTime().should.not.match(/Z$/)
    })

    it('should not have a body hash in the canonical string for CodeCommit Git access', function() {
      var signer = new RequestSigner({service: 'codecommit', method: 'GIT', host: 'example.com'})
      signer.canonicalString().should.match(/\n$/)
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
    it('should use custom port correctly', function() {
      var opts = aws4.sign({hostname: 'localhost', port: '9000', service: 's3', headers: {Date: date}})
      opts.headers['X-Amz-Date'].should.equal(iso)
      opts.headers.Authorization.should.equal(
        'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/us-east-1/s3/aws4_request, ' +
        'SignedHeaders=date;host;x-amz-content-sha256;x-amz-date, ' +
        'Signature=6fda8a58c01edfcb6773c15ad5a276a893ce52978a8f5cd1705fae14df78cfd4')
    })
  })

  describe('#sign() with host', function() {
    it('should populate AWS headers correctly', function() {
      var opts = aws4.sign({host: 'sqs.us-east-1.amazonaws.com', headers: {Date: date}})
      opts.headers['X-Amz-Date'].should.equal(iso)
      opts.headers.Authorization.should.equal(auth)
    })
    it('should use custom port correctly', function() {
      var opts = aws4.sign({host: 'localhost', port: '9000', service: 's3', headers: {Date: date}})
      opts.headers['X-Amz-Date'].should.equal(iso)
      opts.headers.Authorization.should.equal(
        'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/us-east-1/s3/aws4_request, ' +
        'SignedHeaders=date;host;x-amz-content-sha256;x-amz-date, ' +
        'Signature=6fda8a58c01edfcb6773c15ad5a276a893ce52978a8f5cd1705fae14df78cfd4')
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
          'X-Amz-Target': 'DynamoDB_20111205.ListTables',
        },
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
        '/some-bucket?a=%21%27&b=%28%29%2A&X-Amz-Date=20121226T061030Z&X-Amz-Expires=86400&X-Amz-Algorithm=AWS4-HMAC-SHA256&' +
        'X-Amz-Credential=ABCDEF%2F20121226%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-SignedHeaders=host&' +
        'X-Amz-Signature=5f3e8e3406e27471183900f8ee891a6ae40e959c05394b4271a2b5b543d5a14a')
    })
  })

  describe('#sign() with X-Amz-Content-Sha256 header', function() {
    it('should preserve given header', function() {
      var opts = aws4.sign({
        service: 's3',
        method: 'PUT',
        path: '/some-bucket/file.txt',
        body: 'Test Body',
        headers: {
          'X-Amz-Content-Sha256': 'My-Generated-Body-Hash',
        },
      })
      opts.headers['X-Amz-Content-Sha256'].should.equal('My-Generated-Body-Hash')
    })

    it('should use given header in signature calculation', function() {
      var opts = aws4.sign({
        service: 's3',
        method: 'PUT',
        path: '/some-bucket/file.txt',
        body: 'Test Body',
        headers: {
          Date: date,
          'X-Amz-Content-Sha256': 'My-Generated-Body-Hash',
        },
      })
      opts.headers.Authorization.should.equal(
        'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/us-east-1/s3/aws4_request, ' +
        'SignedHeaders=content-length;content-type;date;host;x-amz-content-sha256;x-amz-date, ' +
        'Signature=afa4074a64185317be81ed18953c6df9ee3a63507e6711ad79a7534f4c0b0c54')
    })

    it('should use given lowercase header in signature calculation', function() {
      var opts = aws4.sign({
        service: 's3',
        method: 'PUT',
        path: '/some-bucket/file.txt',
        body: 'Test Body',
        headers: {
          Date: date,
          'x-amz-content-sha256': 'My-Generated-Body-Hash',
        },
      })
      opts.headers.Authorization.should.equal(
        'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/us-east-1/s3/aws4_request, ' +
        'SignedHeaders=content-length;content-type;date;host;x-amz-content-sha256;x-amz-date, ' +
        'Signature=afa4074a64185317be81ed18953c6df9ee3a63507e6711ad79a7534f4c0b0c54')
    })
  })

  describe('#signature() with CodeCommit Git access', function() {
    it('should generate signature correctly', function() {
      var signer = new RequestSigner({
        service: 'codecommit',
        host: 'git-codecommit.us-east-1.amazonaws.com',
        method: 'GIT',
        path: '/v1/repos/MyAwesomeRepo',
      })
      signer.request.headers.Date = date
      signer.getDateTime().should.equal('20121226T061030')
      delete signer.request.headers.Date
      signer.signature().should.equal('2a9a182eb6afc3859ee590af942564b53b0c4e5beac2893052515401d06af92a')
    })
  })

  describe('#canonicalString()', function() {
    it('should work with chars > 127 and < 255 with s3', function() {
      var signer = new RequestSigner({service: 's3', path: '/ü'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%C3%BC')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/%C3%BC')
    })

    it('should work with chars > 127 and < 255 with non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/ü'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%25C3%25BC')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/%C3%BC')
    })

    it('should work with chars > 255 with s3', function() {
      var signer = new RequestSigner({service: 's3', path: '/€'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%E2%82%AC')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/%E2%82%AC')
    })

    it('should work with chars > 255 with non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/€'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%25E2%2582%25AC')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/%E2%82%AC')
    })

    it('should work with chars > 255 with s3 and signQuery', function() {
      var signer = new RequestSigner({service: 's3', path: '/€', signQuery: true})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%E2%82%AC')
      canonical[2].should.match(new RegExp('^X-Amz-Algorithm=AWS4-HMAC-SHA256&' +
        'X-Amz-Credential=ABCDEF%2F\\d{8}%2Fus-east-1%2Fs3%2Faws4_request&' +
        'X-Amz-Date=\\d{8}T\\d{6}Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host$'))
    })

    it('should work with chars > 255 with non-s3 and signQuery', function() {
      var signer = new RequestSigner({service: 'es', path: '/€', signQuery: true})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%25E2%2582%25AC')
      canonical[2].should.match(new RegExp('^X-Amz-Algorithm=AWS4-HMAC-SHA256&' +
        'X-Amz-Credential=ABCDEF%2F\\d{8}%2Fus-east-1%2Fes%2Faws4_request&' +
        'X-Amz-Date=\\d{8}T\\d{6}Z&X-Amz-SignedHeaders=host$'))
    })

    it('should work with reserved chars with s3', function() {
      var signer = new RequestSigner({service: 's3', path: '/%41'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/A')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/%41')
    })

    it('should work with reserved chars with non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/%41'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%2541')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/%41')
    })

    it('should work with RFC-3986 chars with s3', function() {
      var signer = new RequestSigner({service: 's3', path: '/!\'()*%21%27%28%29%2A'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%21%27%28%29%2A%21%27%28%29%2A')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/!\'()*%21%27%28%29%2A')
    })

    it('should work with RFC-3986 chars with non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/!\'()*%21%27%28%29%2A'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%21%27%28%29%2A%2521%2527%2528%2529%252A')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/!\'()*%21%27%28%29%2A')
    })

    it('should normalize casing on percent encoding with s3', function() {
      var signer = new RequestSigner({service: 's3', path: '/%2a'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%2A')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/%2a')
    })

    it('should just escape percent encoding on non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/%2a'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%252a')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/%2a')
    })

    it('should decode %2F with s3', function() {
      var signer = new RequestSigner({service: 's3', path: '/%2f%2f'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('///')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/%2f%2f')
    })

    it('should just escape %2F on non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/%2f%2f'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%252f%252f')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/%2f%2f')
    })

    it('should work with mixed chars > 127 and < 255 and percent encoding with s3', function() {
      var signer = new RequestSigner({service: 's3', path: '/ü%41'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%C3%BCA')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/%C3%BCA')
    })

    it('should work with mixed chars > 127 and < 255 percent encoding with non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/ü%41'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%25C3%25BCA')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/%C3%BCA')
    })

    it('should work with mixed chars > 127 and < 255 and percent encoding and query params with s3', function() {
      var signer = new RequestSigner({service: 's3', path: '/ü%41?a=%41ü'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%C3%BCA')
      canonical[2].should.equal('a=A%C3%BC')
      signer.sign().path.should.equal('/%C3%BCA?a=A%C3%BC')
    })

    it('should work with mixed chars > 127 and < 255 percent encoding and query params with non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/ü%41?a=%41ü'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%25C3%25BCA')
      canonical[2].should.equal('a=A%C3%BC')
      signer.sign().path.should.equal('/%C3%BCA?a=A%C3%BC')
    })

    it('should work with mixed chars > 255 and percent encoding and query params with s3', function() {
      var signer = new RequestSigner({service: 's3', path: '/€ü%41?€ü=%41€ü'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%E2%82%AC%C3%BCA')
      canonical[2].should.equal('%E2%82%AC%C3%BC=A%E2%82%AC%C3%BC')
      signer.sign().path.should.equal('/%E2%82%AC%C3%BCA?%E2%82%AC%C3%BC=A%E2%82%AC%C3%BC')
    })

    it('should work with mixed chars > 255 percent encoding and query params with non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/€ü%41?€ü=%41€ü'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%25E2%2582%25AC%25C3%25BCA')
      canonical[2].should.equal('%E2%82%AC%C3%BC=A%E2%82%AC%C3%BC')
      signer.sign().path.should.equal('/%E2%82%AC%C3%BCA?%E2%82%AC%C3%BC=A%E2%82%AC%C3%BC')
    })

    it('should work with %2F in query params with s3', function() {
      var signer = new RequestSigner({service: 's3', path: '/%2f?a=/&/=%2f'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('//')
      canonical[2].should.equal('%2F=%2F&a=%2F')
      signer.sign().path.should.equal('/%2f?a=%2F&%2F=%2F')
    })

    it('should work with %2F in query params with non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/%2f?a=/&/=%2f'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%252f')
      canonical[2].should.equal('%2F=%2F&a=%2F')
      signer.sign().path.should.equal('/%2f?a=%2F&%2F=%2F')
    })

    it('should work with query param order in s3', function() {
      var signer = new RequestSigner({service: 's3', path: '/?a=b&a=B&a=b&a=c'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/')
      canonical[2].should.equal('a=b')
      signer.sign().path.should.equal('/?a=b&a=B&a=b&a=c')
    })

    it('should work with query param order in non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/?a=b&a=B&a=b&a=c'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/')
      canonical[2].should.equal('a=B&a=b&a=b&a=c')
      signer.sign().path.should.equal('/?a=b&a=B&a=b&a=c')
    })

    it('should not normalize path in s3', function() {
      var signer = new RequestSigner({service: 's3', path: '//a/b/..//c/.?a=b'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('//a/b/..//c/.')
      canonical[2].should.equal('a=b')
      signer.sign().path.should.equal('//a/b/..//c/.?a=b')
    })

    it('should normalize path in non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '//a/b/..//c/.?a=b'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/a/c')
      canonical[2].should.equal('a=b')
      signer.sign().path.should.equal('//a/b/..//c/.?a=b')
    })

    it('should normalize path in non-s3 with slash on the end', function() {
      var signer = new RequestSigner({service: 'es', path: '//a/b/..//c/./?a=b'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/a/c/')
      canonical[2].should.equal('a=b')
      signer.sign().path.should.equal('//a/b/..//c/./?a=b')
    })

    it('should deal with complex query params in s3', function() {
      var signer = new RequestSigner({service: 's3', path: '/?&a=&&=&%41&'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/')
      canonical[2].should.equal('A=&a=')
      signer.sign().path.should.equal('/?a=&A=')
    })

    it('should deal with complex query params in non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/?&a=&&=&%41&'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/')
      canonical[2].should.equal('A=&a=')
      signer.sign().path.should.equal('/?a=&A=')
    })

  })

  describe('with AWS test suite', function() {
    var CREDENTIALS = {
      accessKeyId: 'AKIDEXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
    }
    var SERVICE = 'service'

    var suiteDir = path.join(__dirname, 'aws-sig-v4-test-suite')
    var ignoreDirs = ['get-header-value-multiline', 'normalize-path', 'post-sts-token'] // too annoying to parse multiline
    var tests = fs.readdirSync(suiteDir)
      .concat(fs.readdirSync(path.join(suiteDir, 'normalize-path')).map(function(d) { return path.join('normalize-path', d) }))
      .filter(function(t) { return !~t.indexOf('.') && !~ignoreDirs.indexOf(t) })

    tests.forEach(function(test) {

      it('should pass ' + test, function() {
        var files = fs.readdirSync(path.join(suiteDir, test))
        var readFile = function(regex) {
          var file = path.join(suiteDir, test, files.filter(regex.test.bind(regex))[0])
          return fs.readFileSync(file, 'utf8').replace(/\r/g, '')
        }
        var request = readFile(/\.req$/)
        var canonicalString = readFile(/\.creq$/)
        var stringToSign = readFile(/\.sts$/)
        var outputAuth = readFile(/\.authz$/)

        var reqLines = request.split('\n')
        var req = reqLines[0].split(' ')
        var method = req[0]
        var pathname = req.slice(1, -1).join(' ')
        var headers = {}
        for (var i = 1; i < reqLines.length; i++) {
          if (!reqLines[i]) break
          var colonIx = reqLines[i].indexOf(':')
          var header = reqLines[i].slice(0, colonIx).toLowerCase()
          var value = reqLines[i].slice(colonIx + 1)
          if (headers[header]) {
            headers[header] = headers[header].split(',')
            headers[header].push(value)
            headers[header] = headers[header].join(',')
          } else {
            headers[header] = value
          }
        }
        var body = reqLines.slice(i + 1).join('\n')

        var signer = new RequestSigner({
          service: SERVICE,
          method: method,
          path: pathname,
          headers: headers,
          body: body,
          doNotModifyHeaders: true,
          doNotEncodePath: true,
        }, CREDENTIALS)

        if (signer.datetime == null && headers['x-amz-date']) {
          signer.datetime = headers['x-amz-date']
        }

        signer.canonicalString().should.equal(canonicalString)
        signer.stringToSign().should.equal(stringToSign)
        signer.sign().headers.Authorization.should.equal(outputAuth)
      })

    })
  })
})


describe('lru', function() {

  it('should return nothing if does not exist yet', function() {
    var cache = lru(5)
    should.not.exist(cache.get('a'))
  })

  it('should return value from single set', function() {
    var cache = lru(5)
    cache.set('a', 'A')
    cache.get('a').should.equal('A')
  })

  it('should return value if just at capacity', function() {
    var cache = lru(5)
    cache.set('a', 'A')
    cache.set('b', 'B')
    cache.set('c', 'C')
    cache.set('d', 'D')
    cache.set('e', 'E')
    cache.get('e').should.equal('E')
    cache.get('d').should.equal('D')
    cache.get('c').should.equal('C')
    cache.get('b').should.equal('B')
    cache.get('a').should.equal('A')
  })

  it('should not return value just over capacity', function() {
    var cache = lru(5)
    cache.set('a', 'A')
    cache.set('b', 'B')
    cache.set('c', 'C')
    cache.set('d', 'D')
    cache.set('e', 'E')
    cache.set('f', 'F')
    cache.get('f').should.equal('F')
    cache.get('e').should.equal('E')
    cache.get('d').should.equal('D')
    cache.get('c').should.equal('C')
    cache.get('b').should.equal('B')
    should.not.exist(cache.get('a'))
  })

  it('should return value if get recently', function() {
    var cache = lru(5)
    cache.set('a', 'A')
    cache.set('b', 'B')
    cache.set('c', 'C')
    cache.set('d', 'D')
    cache.set('e', 'E')
    cache.get('a').should.equal('A')
    cache.set('f', 'F')
    cache.get('f').should.equal('F')
    cache.get('e').should.equal('E')
    cache.get('d').should.equal('D')
    cache.get('c').should.equal('C')
    cache.get('a').should.equal('A')
    should.not.exist(cache.get('b'))
  })

  it('should return value if set recently', function() {
    var cache = lru(5)
    cache.set('a', 'A')
    cache.set('b', 'B')
    cache.set('c', 'C')
    cache.set('d', 'D')
    cache.set('e', 'E')
    cache.set('a', 'AA')
    cache.set('f', 'F')
    cache.get('f').should.equal('F')
    cache.get('e').should.equal('E')
    cache.get('d').should.equal('D')
    cache.get('c').should.equal('C')
    cache.get('a').should.equal('AA')
    should.not.exist(cache.get('b'))
  })

})
