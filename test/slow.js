const https = require('https')
const { RequestSigner } = require('../')

https.globalAgent.maxSockets = 10

void (async() => {
  let paths = [
    '/ü',
    '/€',
    '/%41',
    '/!\'()*@%21%27%28%29%2A',
    '/%2a',
    '/%2f%2f',
    '/ü%41',
    '/ü%41?a=%41ü',
    '/€ü%41?€ü=%41€ü',
    '/%2f?a=/&/=%2f',
    '/?a=b&a=B&a=b&a=c',
    '//a/b/..//c/.?a=b',
    '//a/b/..//c/./?a=b',
    '/?&a=&&=&%41&',
    '/?a=A&*=a&@=b',
    '/?{~>)[=|\':\'_"&$*\'A+=a^~0$&A:{<$=/[<}>&^|<}/={^~|円&;^/( =({A-~&円/)円0=^*<:&){!|<=>[-(~',
    '/?{~>)[=|\':\'_"&$*\'A+=a^~0$&A:{<$=/[<}>&^|<}/={^~|&;^/( =({A-~&/)0=^*<:&){!|<=>[-(~',
    '/?s-=s-&s-=s&s',
    '/?s-{~>)[=|\':\'_"&s-{~>)[=a^~0$&s-{~>)[=A-~&円&s',
  ]

  let tests = [{
    url: 'https://runtime.sagemaker.us-east-1.amazonaws.com/a=b~ and c * \' (what+ever)!?a=b~ and c * \' @(whatever)!',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{}',
  }, {
    url: 'https://runtime.sagemaker.us-east-1.amazonaws.com/a=b~ and c * \' (what+ever)!?a=b~ and c * \' @(whatever)!',
    signQuery: true,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'X-Amz-Target': 'SageMaker.ListEndpoints',
    },
    body: '{}',
  }, {
    url: 'https://s3.amazonaws.com/test//`@$^&*()-_+[]{}\\|;:.,<>€ü%41=b~ and c * \' //(whatever)!?€ü`@$^&*()-_+[]{}\\|;:.,<>=`@$^&*()-_+[]{}\\|;:.,<>%41€üab~ and c * \' (whatever)!',
    method: 'POST',
    body: '',
  }, {
    url: 'https://s3.amazonaws.com/test//`@$^&*()-_+[]{}\\|;:.,<>€ü%41=b~ and c * \' //(whatever)!?€ü`@$^&*()-_+[]{}\\|;:.,<>=`@$^&*()-_+[]{}\\|;:.,<>%41€üab~ and c * \' (whatever)!',
    signQuery: true,
    method: 'POST',
    body: '',
  }]

  paths.forEach(p => tests.push({ url: `https://s3.amazonaws.com/test${p}` }))
  paths.forEach(p => tests.push({ url: `https://s3.amazonaws.com/test${p}`, signQuery: true }))
  paths.forEach(p => tests.push({ url: `https://runtime.sagemaker.us-east-1.amazonaws.com/test${p}` }))
  paths.forEach(p => tests.push({ url: `https://runtime.sagemaker.us-east-1.amazonaws.com/test${p}`, signQuery: true }))

  tests.forEach(test => {
    test.accessKeyId = process.env.AWS_ACCESS_KEY_ID
    test.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    test.sessionToken = process.env.AWS_SESSION_TOKEN
  })

  let okTests = [{
    url: 'https://s3.us-east-1.amazonaws.com/',
  }, {
    url: 'https://s3-eu-west-1.amazonaws.com/',
  }, {
    url: 'https://s3-us-east-2.amazonaws.com/',
  }, {
    url: 'https://sqs.us-east-1.amazonaws.com/?Action=ListQueues',
  }, {
    url: 'https://iam.amazonaws.com/?Action=ListGroups&Version=2010-05-08',
  }, {
    url: 'https://ec2.us-east-1.amazonaws.com/?Action=DescribeRegions&Version=2014-06-15',
  }, {
    url: 'https://sns.us-east-1.amazonaws.com/?Action=ListTopics&Version=2010-03-31',
  }, {
    url: 'https://sts.us-east-1.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15',
  }, {
    url: 'https://cloudsearch.us-east-1.amazonaws.com/?Action=ListDomainNames&Version=2013-01-01',
  }, {
    url: 'https://email.us-east-1.amazonaws.com/?Action=ListIdentities&Version=2010-12-01',
  }, {
    url: 'https://autoscaling.us-east-1.amazonaws.com/?Action=DescribeAutoScalingInstances&Version=2011-01-01',
  }, {
    url: 'https://elasticloadbalancing.us-east-1.amazonaws.com/?Action=DescribeLoadBalancers&Version=2012-06-01',
  }, {
    url: 'https://cloudformation.us-east-1.amazonaws.com/?Action=ListStacks&Version=2010-05-15',
  }, {
    url: 'https://elasticbeanstalk.us-east-1.amazonaws.com/?Action=ListAvailableSolutionStacks&Version=2010-12-01',
  }, {
    url: 'https://rds.us-east-1.amazonaws.com/?Action=DescribeDBInstances&Version=2012-09-17',
  }, {
    url: 'https://monitoring.us-east-1.amazonaws.com/?Action=ListMetrics&Version=2010-08-01',
  }, {
    url: 'https://redshift.us-east-1.amazonaws.com/?Action=DescribeClusters&Version=2012-12-01',
  }, {
    url: 'https://cloudfront.amazonaws.com/2014-05-31/distribution',
  }, {
    url: 'https://elasticache.us-east-1.amazonaws.com/?Action=DescribeCacheClusters&Version=2014-07-15',
  }, {
    url: 'https://elasticmapreduce.us-east-1.amazonaws.com/?Action=ListClusters&Version=2009-03-31',
  }, {
    url: 'https://route53.amazonaws.com/2013-04-01/hostedzone',
  }, {
    url: 'https://cognito-sync.us-east-1.amazonaws.com/identitypools',
  }, {
    url: 'https://elastictranscoder.us-east-1.amazonaws.com/2012-09-25/pipelines',
  }, {
    url: 'https://lambda.us-east-1.amazonaws.com/2014-11-13/functions/',
  }, {
    url: 'https://ecs.us-east-1.amazonaws.com/?Action=ListClusters&Version=2014-11-13',
  }, {
    url: 'https://glacier.us-east-1.amazonaws.com/-/vaults',
    headers: {
      'X-Amz-Glacier-Version': '2012-06-01',
      'Accept-Encoding': 'gzip, deflate, br',
    },
  }, {
    url: 'https://dynamodb.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.0',
      'X-Amz-Target': 'DynamoDB_20120810.ListTables',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{}',
  }, {
    url: 'https://dynamodb.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.0',
      'X-Amz-Target': 'DynamoDB_20120810.ListTables',
      'Accept-Encoding': 'gzip, deflate, br',
      'User-Agent': 'node',
    },
    extraHeadersToInclude: {
      'user-agent': true,
    },
    body: '{}',
  }, {
    url: 'https://dynamodb.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.0',
      'X-Amz-Target': 'DynamoDB_20120810.ListTables',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    extraHeadersToIgnore: {
      'content-type': true,
    },
    body: '{}',
  }, {
    service: 'appstream',
    url: 'https://appstream2.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'PhotonAdminProxyService.DescribeFleets',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{}',
  }, {
    url: 'https://storagegateway.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'StorageGateway_20120630.ListGateways',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{}',
  }, {
    url: 'https://datapipeline.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'DataPipeline.ListPipelines',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{}',
  }, {
    url: 'https://route53domains.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'Route53Domains_v20140515.ListDomains',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{}',
  }, {
    url: 'https://kinesis.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'Kinesis_20131202.ListStreams',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{}',
  }, {
    url: 'https://cloudtrail.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'CloudTrail_20131101.DescribeTrails',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{}',
  }, {
    url: 'https://logs.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'Logs_20140328.DescribeLogGroups',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{}',
  }, {
    url: 'https://codedeploy.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'CodeDeploy_20141006.ListApplications',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{}',
  }, {
    url: 'https://directconnect.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'OvertureService.DescribeConnections',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{}',
  }, {
    url: 'https://kms.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'TrentService.ListKeys',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{}',
  }, {
    url: 'https://config.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'StarlingDoveService.DescribeDeliveryChannels',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{}',
  }, {
    service: 'cloudhsm',
    url: 'https://cloudhsmv2.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'BaldrApiService.DescribeClusters',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{}',
  }, {
    url: 'https://swf.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.0',
      'X-Amz-Target': 'SimpleWorkflowService.ListDomains',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{"registrationStatus":"REGISTERED"}',
  }, {
    url: 'https://cognito-identity.us-east-1.amazonaws.com/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityService.ListIdentityPools',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: '{"MaxResults": 1}',
  }]

  okTests = okTests.concat(okTests.map(test => Object.assign({ signQuery: true }, test)))

  okTests.forEach(test => {
    test.accessKeyId = process.env.AWS_ACCESS_KEY_ID
    test.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    test.sessionToken = process.env.AWS_SESSION_TOKEN
  })

  try {
    const signed = await getSignedTests(tests)
    const responses = await Promise.all(signed.map(request))

    responses.map((r, i) => {
      if (/InvalidSignatureException|SignatureDoesNotMatch/.test(r.body)) {
        return {
          index: i,
          method: signed[i].method || 'GET',
          path: signed[i].path,
          url: signed[i].url,
          canonicalString: signed[i].canonicalString,
          body: r.body.replace(/&amp;/g, '&'),
        }
      } else {
        console.log('Passed tests ' + i)
      }
    }).filter(Boolean).forEach(({ index, method, path, url, canonicalString, body }) => {
      console.log('Test ' + index)
      console.log(method + ' ' + path)
      console.log('--------------')
      console.log(url)
      console.log('--------------')
      console.log(canonicalString)
      console.log('--------------')
      console.log(body)
      console.log('==============')
    })
  } catch (e) {
    console.error(e)
  }

  try {
    const signed = await getSignedTests(okTests)
    const responses = await Promise.all(signed.map(request))

    responses.map((r, i) => {
      if (r.statusCode !== 200) {
        return {
          index: i,
          method: signed[i].method || 'GET',
          path: signed[i].path,
          url: signed[i].url,
          canonicalString: signed[i].canonicalString,
          body: r.body.replace(/&amp;/g, '&'),
        }
      } else {
        console.log('Passed okTests ' + i)
      }
    }).filter(Boolean).forEach(({ index, method, path, url, canonicalString, body }) => {
      console.log('Test ' + index)
      console.log(method + ' ' + path)
      console.log('--------------')
      console.log(url)
      console.log('--------------')
      console.log(canonicalString)
      console.log('--------------')
      console.log(body)
      console.log('==============')
    })
  } catch (e) {
    console.error(e)
  }
})()

async function getSignedTests(tests) {
  return tests.map(test => {
    var url = test.url
    var urlPieces = url.split('/')
    test.host = urlPieces[2]
    test.path = '/' + urlPieces.slice(3).join('/')
    delete test.url
    test.headers = Object.assign({}, test.headers)
    var signer = new RequestSigner(test)
    var signed = signer.sign()
    signed.canonicalString = signer.canonicalString()
    signed.url = url
    return signed
  })
}

const RETRY_ERRS = ['EADDRINFO', 'ETIMEDOUT', 'ECONNRESET', 'ESOCKETTIMEDOUT', 'ENOTFOUND', 'EMFILE']

async function request(options) {
  options.retries = options.retries || 0
  return new Promise((resolve, reject) => {
    const onError = err => {
      if (RETRY_ERRS.includes(err.code) && options.retries < 5) {
        options.retries++
        return request(options).then(resolve).catch(reject)
      }
      reject(err)
    }
    https.request(options, res => {
      let bufs = []
      res.on('error', onError)
      res.on('data', bufs.push.bind(bufs))
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(bufs).toString('utf8'),
        })
      })
    }).on('error', onError).end(options.body)
  })
}
