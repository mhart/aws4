var http  = require('http')
  , https = require('https')
  , aws4  = require('aws4')
  , opts  = { host: 'sqs.us-east-1.amazonaws.com', path: '/?Action=ListQueues' }

// assuming AWS credentials are available from process.env
aws4.sign(opts)

// opts.headers now contains the signed AWS headers, and can be used
// in standard node.js http(s) requests

// pipe the SOAP response from SQS to stdout
http.request(opts, function(res) { res.pipe(process.stdout) }).end()

// you can pass AWS credentials in explicitly
aws4.sign(opts, { accessKeyId: '', secretAccessKey: '' })

// aws4 can infer the host from a service and region
opts = aws4.sign({ service: 'sqs', region: 'us-east-1', path: '/?Action=ListQueues' })

// aws4 can infer the HTTP method if a body is passed in
opts = aws4.sign({ service: 'iam', body: 'Action=ListGroups&Version=2010-05-08' })

// opts.method will be POST and Content-Type 'application/x-www-form-urlencoded'
https.request(opts, function(res) { res.pipe(process.stdout) }).end(opts.body)

// can specify any custom option or header as per usual
opts = aws4.sign({
  service: 'dynamodb',
  region: 'ap-southeast-2',
  method: 'POST',
  path: '/',
  headers: {
    'Content-Type': 'application/x-amz-json-1.0',
    'X-Amz-Target': 'DynamoDB_20111205.ListTables'
  },
  body: '{}'
})

// works with all other services that support Signature Version 4

opts = aws4.sign({ service: 'sts', path: '/?Action=GetSessionToken&Version=2011-06-15' })

opts = aws4.sign({
  service: 'glacier',
  path: '/-/vaults',
  headers: { 'X-Amz-Glacier-Version': '2012-06-01' }
})

opts = aws4.sign({ service: 'cloudsearch', path: '/?Action=DescribeDomains' })
