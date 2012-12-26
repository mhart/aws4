var http  = require('http')
  , https = require('https')
  , aws4  = require('aws4')

// given an options object you could pass to http.request
var opts = { host: 'sqs.us-east-1.amazonaws.com', path: '/?Action=ListQueues' }

aws4.sign(opts) // assumes AWS credentials are available in process.env

// opts.headers now contains the signed AWS headers, and is ready for
// use in standard node.js http(s) requests

// eg, pipe the SOAP response from the above SQS request to stdout
http.request(opts, function(res) { res.pipe(process.stdout) }).end()

// you can pass AWS credentials in explicitly
aws4.sign(opts, { accessKeyId: '', secretAccessKey: '' })

// aws4 can infer the host from a service and region
opts = aws4.sign({ service: 'sqs', region: 'us-east-1', path: '/?Action=ListQueues' })

// create a utility function to pipe to stdout (with https this time)
function request(o) { https.request(o, function(res) { res.pipe(process.stdout) }).end(o.body || '') }

// aws4 can infer the HTTP method if a body is passed in
// method will be POST and Content-Type: 'application/x-www-form-urlencoded'
request(aws4.sign({ service: 'iam', body: 'Action=ListGroups&Version=2010-05-08' }))

// can specify any custom option or header as per usual
request(aws4.sign({
  service: 'dynamodb',
  region: 'ap-southeast-2',
  method: 'POST',
  path: '/',
  headers: {
    'Content-Type': 'application/x-amz-json-1.0',
    'X-Amz-Target': 'DynamoDB_20111205.ListTables'
  },
  body: '{}'
}))

// works with all other services that support Signature Version 4

request(aws4.sign({ service: 'sts', path: '/?Action=GetSessionToken&Version=2011-06-15' }))

request(aws4.sign({ service: 'glacier', path: '/-/vaults', headers: { 'X-Amz-Glacier-Version': '2012-06-01' } }))

request(aws4.sign({ service: 'cloudsearch', path: '/?Action=DescribeDomains' }))

