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

  before(function() {
    process.env.AWS_ACCESS_KEY_ID = cred.accessKeyId
    process.env.AWS_SECRET_ACCESS_KEY = cred.secretAccessKey
    delete process.env.AWS_SESSION_TOKEN
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

    it('should recognise older S3 bare url', function() {
      var signer = new RequestSigner('https://s3.amazonaws.com/jbarr-public/whatever')
      signer.service.should.equal('s3')
      signer.region.should.equal('us-east-1')
    })

    it('should recognise older S3 regional url', function() {
      var signer = new RequestSigner('https://s3.eu-west-3.amazonaws.com/jbarr-public/whatever')
      signer.service.should.equal('s3')
      signer.region.should.equal('eu-west-3')
    })

    it('should recognise super old S3 regional url', function() {
      var signer = new RequestSigner('https://s3-eu-west-1.amazonaws.com/jbarr-public/whatever')
      signer.service.should.equal('s3')
      signer.region.should.equal('eu-west-1')
    })

    it('should recognise newer S3 bare url', function() {
      var signer = new RequestSigner('https://jbarr-public.s3.amazonaws.com/whatever')
      signer.service.should.equal('s3')
      signer.region.should.equal('us-east-1')
    })

    it('should recognise newer S3 bare url', function() {
      var signer = new RequestSigner('https://jbarr-public.s3.amazonaws.com/whatever')
      signer.service.should.equal('s3')
      signer.region.should.equal('us-east-1')
    })

    it('should recognise newer S3 regional url', function() {
      var signer = new RequestSigner('https://jbarr-public.s3.eu-west-3.amazonaws.com/whatever')
      signer.service.should.equal('s3')
      signer.region.should.equal('eu-west-3')
    })

    it('should recognise newer, but kinda older, S3 regional url', function() {
      var signer = new RequestSigner('https://jbarr-public.s3-eu-west-1.amazonaws.com/whatever')
      signer.service.should.equal('s3')
      signer.region.should.equal('eu-west-1')
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

    it('should not add bucket to hostname if dot in s3 bucket and us-east-1', function() {
      var opts = aws4.sign({service: 's3', path: '/jbarr.public'})
      opts.hostname.should.equal('s3.amazonaws.com')
      opts.headers.Host.should.equal('s3.amazonaws.com')
    })

    it('should not add bucket to hostname if dot in s3 bucket and us-east-2', function() {
      var opts = aws4.sign({service: 's3', region: 'us-east-2', path: '/jbarr.public/somefile'})
      opts.hostname.should.equal('s3.us-east-2.amazonaws.com')
      opts.headers.Host.should.equal('s3.us-east-2.amazonaws.com')
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
      opts.hostname.should.equal('s3.us-west-1.amazonaws.com')
      opts.headers.Host.should.equal('s3.us-west-1.amazonaws.com')
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
          'Connection': 'keep-alive',
        },
      })
      opts.headers['X-Amz-Date'].should.equal(iso)
      opts.headers.Authorization.should.equal(
        'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/ap-southeast-2/dynamodb/aws4_request, ' +
        'SignedHeaders=content-length;content-type;date;host;x-amz-date;x-amz-target, ' +
        'Signature=f9a00417d284dfe2cfdef809652c1d54add4e159835a0c69ac8cbdaa227a5000')
    })
  })

  describe('#sign() with copies', function() {
    it('should modify request/opts in place and return same object', function() {
      var opts = {service: 'sqs'}
      var newOpts = aws4.sign(opts)
      opts.should.equal(newOpts)
    })

    it('should not modify existing headers', function() {
      var headers = {
        'Content-Type': 'application/x-amz-json-1.0',
        'X-Amz-Target': 'DynamoDB_20120810.ListTables',
      }
      var opts = aws4.sign({
        service: 'dynamodb',
        headers: headers,
        body: '{}',
      })
      opts.headers.should.not.equal(headers)
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

  describe('#sign() with extraHeadersToIgnore', function() {
    it('should generate signature correctly', function() {
      var opts = aws4.sign({
        host: '07tjusf2h91cunochc.us-east-1.aoss.amazonaws.com',
        method: 'PUT',
        path: '/my-index',
        body: '{"mappings":{}}',
        headers: {
          Date: date,
          'Content-Type': 'application/json',
          'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
        },
        extraHeadersToIgnore: {
          'content-length': true
        },
      })
      opts.headers.Authorization.should.equal(
        'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/us-east-1/aoss/aws4_request, ' +
        'SignedHeaders=content-type;date;host;x-amz-content-sha256;x-amz-date, ' +
        'Signature=742b9db3c09dbc6d29dd965fa44ec2d004d4aed4f0f4d179d0ee989c08c9bf06')
    })
  })

  describe('#sign() with extraHeadersToInclude', function() {
    it('should generate signature correctly', function() {
      var opts = aws4.sign({
        service: 'someservice',
        path: '/whatever',
        headers: {
          Date: date,
          'Range': 'bytes=200-1000, 2000-6576, 19000-',
        },
        extraHeadersToInclude: {
          'range': true
        },
      })
      opts.headers.Authorization.should.equal(
        'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/us-east-1/someservice/aws4_request, ' +
        'SignedHeaders=date;host;range;x-amz-date, ' +
        'Signature=8298a63e47319d57c1af6dfb5e5e5f1b30d2515ad1130d7f240b57ce94302d59')
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
      var signer = new RequestSigner({service: 's3', path: '/!\'()*@%21%27%28%29%2A?a=A&*=a&@=b'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%21%27%28%29%2A%40%21%27%28%29%2A')
      canonical[2].should.equal('%2A=a&%40=b&a=A')
      signer.sign().path.should.equal('/!\'()*@%21%27%28%29%2A?a=A&%2A=a&%40=b')
    })

    it('should work with RFC-3986 chars with non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/!\'()*@%21%27%28%29%2A?a=A&*=a&@=b'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%21%27%28%29%2A%40%2521%2527%2528%2529%252A')
      canonical[2].should.equal('%2A=a&%40=b&a=A')
      signer.sign().path.should.equal('/!\'()*@%21%27%28%29%2A?a=A&%2A=a&%40=b')
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

    it('should decode + as space with s3', function() {
      var signer = new RequestSigner({service: 's3', path: '/++'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%20%20')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/++')
    })

    it('should just leave + on non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/++'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%2B%2B')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/++')
    })

    it('should decode %2B with s3', function() {
      var signer = new RequestSigner({service: 's3', path: '/%2b%2b'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%2B%2B')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/%2b%2b')
    })

    it('should just escape %2B on non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/%2b%2b'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/%252b%252b')
      canonical[2].should.equal('')
      signer.sign().path.should.equal('/%2b%2b')
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
      var signer = new RequestSigner({service: 's3', path: '/?a-=a&a=b&a=B&a=b&a=c'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/')
      canonical[2].should.equal('a=b&a-=a')
      signer.sign().path.should.equal('/?a-=a&a=b&a=B&a=b&a=c')
    })

    it('should work with query param order in non-s3', function() {
      var signer = new RequestSigner({service: 'es', path: '/?a-=a&a=b&a=B&a=b&a=c'})
      var canonical = signer.canonicalString().split('\n')

      canonical[1].should.equal('/')
      canonical[2].should.equal('a=B&a=b&a=b&a=c&a-=a')
      signer.sign().path.should.equal('/?a-=a&a=b&a=B&a=b&a=c')
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
    var DATETIME = '20150830T123600Z'

    awsFixtures().forEach(function(test) {

      it('should pass ' + test.test, function() {
        var signer = new RequestSigner({
          service: SERVICE,
          method: test.method,
          host: test.host,
          path: test.pathname,
          headers: headerArrayToObject(test.headers),
          body: test.body,
          doNotModifyHeaders: true,
          doNotEncodePath: true,
        }, CREDENTIALS)

        if (signer.datetime == null) {
          signer.datetime = DATETIME
        }

        signer.canonicalString().should.equal(test.canonicalString)
        signer.stringToSign().should.equal(test.stringToSign)
        signer.sign().headers.Authorization.should.equal(test.authHeader)
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


function awsFixtures() {
  return matchingFiles(path.join(__dirname, 'aws-sig-v4-test-suite'), /\.req$/).map(function(file) {
    var test = file.split('/').pop().split('.')[0]
    var filePieces = fs.readFileSync(file, 'utf8').trim().split('\n\n')
    var preamble = filePieces[0]
    var body = filePieces[1]
    var lines = (preamble + '\n').split('\n')
    var methodPath = lines[0].split(' ')
    var method = methodPath[0]
    var pathname = methodPath.slice(1, -1).join(' ')
    var headerLines = lines.slice(1).join('\n').split(':')
    var headers = []
    var url = ''
    var host = ''
    for (var i = 0; i < headerLines.length - 1; i++) {
      var name = headerLines[i]
      var newlineIx = headerLines[i + 1].lastIndexOf('\n')
      var value = headerLines[i + 1].slice(0, newlineIx)
      headerLines[i + 1] = headerLines[i + 1].slice(newlineIx + 1)
      if (name.toLowerCase() === 'host') {
        host = value
        url = 'https://' + value + pathname
      } else {
        value.split('\n').forEach(function(v) { headers.push([name, v]) })
      }
    }
    var canonicalString = fs.readFileSync(file.replace(/\.req$/, '.creq'), 'utf8').trim()
    var stringToSign = fs.readFileSync(file.replace(/\.req$/, '.sts'), 'utf8').trim()
    var authHeader = fs.readFileSync(file.replace(/\.req$/, '.authz'), 'utf8').trim()

    return {
      test: test,
      method: method,
      url: url,
      host: host,
      pathname: pathname,
      headers: headers,
      body: body,
      canonicalString: canonicalString,
      stringToSign: stringToSign,
      authHeader: authHeader,
    }
  })
}

function matchingFiles(dir, regex) {
  var ls = fs.readdirSync(dir).map(function(file) { return path.join(dir, file) })
  var dirs = ls.filter(function(file) { return fs.lstatSync(file).isDirectory() })
  var files = ls.filter(regex.test.bind(regex))
  dirs.forEach(function(dir) { files = files.concat(matchingFiles(dir, regex)) })
  return files
}

function headerArrayToObject(headersList) {
  var headers = Object.create(null)
  headersList.forEach(function(headerEntry) {
    var headerName = headerEntry[0]
    var headerValue = headerEntry[1].trim()
    if (headers[headerName] != null) {
      headers[headerName] += ',' + headerValue
    } else {
      headers[headerName] = headerValue
    }
  })
  return headers
}
