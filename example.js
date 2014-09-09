var http  = require('http'),
    https = require('https'),
    aws4  = require('aws4')

// given an options object you could pass to http.request
var opts = { host: 'sqs.us-east-1.amazonaws.com', path: '/?Action=ListQueues' }

aws4.sign(opts) // assumes AWS credentials are available in process.env

console.log(opts)
/*
{
  host: 'sqs.us-east-1.amazonaws.com',
  path: '/?Action=ListQueues',
  headers: {
    Host: 'sqs.us-east-1.amazonaws.com',
    'X-Amz-Date': '20121226T061030Z',
    Authorization: 'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/us-east-1/sqs/aws4_request, ...'
  }
}
*/

// we can now use this to query AWS using the standard node.js http API
http.request(opts, function(res) { res.pipe(process.stdout) }).end()
/*
<?xml version="1.0"?>
<ListQueuesResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/">
...
*/

// you can pass AWS credentials in explicitly
aws4.sign(opts, { accessKeyId: '', secretAccessKey: '' })

// aws4 can infer the host from a service and region
opts = aws4.sign({ service: 'sqs', region: 'us-east-1', path: '/?Action=ListQueues' })

// create a utility function to pipe to stdout (with https this time)
function request(o) { https.request(o, function(res) { res.pipe(process.stdout) }).end(o.body || '') }

// aws4 can infer the HTTP method if a body is passed in
// method will be POST and Content-Type: 'application/x-www-form-urlencoded; charset=utf-8'
request(aws4.sign({ service: 'iam', body: 'Action=ListGroups&Version=2010-05-08' }))
/*
<ListGroupsResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
...
*/

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
/*
{"TableNames":[]}
...
*/

// works with all other services that support Signature Version 4

request(aws4.sign({ service: 'ec2', path: '/?Action=DescribeRegions&Version=2014-06-15' }))
/*
<DescribeRegionsResponse xmlns="http://ec2.amazonaws.com/doc/2014-06-15/">
...
*/

request(aws4.sign({ service: 'sns', path: '/?Action=ListTopics' }))
/*
<ListTopicsResponse xmlns="http://sns.amazonaws.com/doc/2010-03-31/">
...
*/

request(aws4.sign({ service: 'sts', path: '/?Action=GetSessionToken&Version=2011-06-15' }))
/*
<GetSessionTokenResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
...
*/

request(aws4.sign({ service: 'glacier', path: '/-/vaults', headers: { 'X-Amz-Glacier-Version': '2012-06-01' } }))
/*
{"Marker":null,"VaultList":[]}
...
*/

request(aws4.sign({ service: 'cloudsearch', path: '/?Action=DescribeDomains' }))
/*
<DescribeDomainsResponse xmlns="http://cloudsearch.amazonaws.com/doc/2011-02-01">
...
*/

request(aws4.sign({ service: 'ses', path: '/?Action=ListIdentities' }))
/*
<ListIdentitiesResponse xmlns="http://ses.amazonaws.com/doc/2010-12-01/">
...
*/

request(aws4.sign({ service: 'autoscaling', path: '/?Action=DescribeAutoScalingInstances&Version=2011-01-01' }))
/*
<DescribeAutoScalingInstancesResponse xmlns="http://autoscaling.amazonaws.com/doc/2011-01-01/">
...
*/

request(aws4.sign({ service: 'elasticloadbalancing', path: '/?Action=DescribeLoadBalancers&Version=2012-06-01' }))
/*
<DescribeLoadBalancersResponse xmlns="http://elasticloadbalancing.amazonaws.com/doc/2012-06-01/">
...
*/

request(aws4.sign({ service: 'cloudformation', path: '/?Action=ListStacks&Version=2010-05-15' }))
/*
<ListStacksResponse xmlns="http://cloudformation.amazonaws.com/doc/2010-05-15/">
...
*/

request(aws4.sign({ service: 'elasticbeanstalk', path: '/?Action=ListAvailableSolutionStacks&Version=2010-12-01' }))
/*
<ListAvailableSolutionStacksResponse xmlns="http://elasticbeanstalk.amazonaws.com/docs/2010-12-01/">
...
*/

request(aws4.sign({ service: 'rds', path: '/?Action=DescribeDBInstances&Version=2012-09-17' }))
/*
<DescribeDBInstancesResponse xmlns="http://rds.amazonaws.com/doc/2012-09-17/">
...
*/

request(aws4.sign({ service: 'monitoring', path: '/?Action=ListMetrics&Version=2010-08-01' }))
/*
<ListMetricsResponse xmlns="http://monitoring.amazonaws.com/doc/2010-08-01/">
...
*/

request(aws4.sign({ service: 'redshift', path: '/?Action=DescribeClusters&Version=2012-12-01' }))
/*
<DescribeClustersResponse xmlns="http://redshift.amazonaws.com/doc/2012-12-01/">
...
*/

request(aws4.sign({ service: 'cloudfront', path: '/2014-05-31/distribution' }))
/*
<DistributionList xmlns="http://cloudfront.amazonaws.com/doc/2014-05-31/">
...
*/

request(aws4.sign({ service: 'elasticache', path: '/?Action=DescribeCacheClusters&Version=2014-07-15' }))
/*
<DescribeCacheClustersResponse xmlns="http://elasticache.amazonaws.com/doc/2014-07-15/">
...
*/

request(aws4.sign({ service: 'elasticmapreduce', path: '/?Action=DescribeJobFlows&Version=2009-03-31' }))
/*
<DescribeJobFlowsResponse xmlns="http://elasticmapreduce.amazonaws.com/doc/2009-03-31">
...
*/

request(aws4.sign({ service: 'storagegateway', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'StorageGateway_20120630.ListGateways'
}}))
/*
{"Gateways":[]}
...
*/

request(aws4.sign({ service: 'datapipeline', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'DataPipeline.ListPipelines'
}}))
/*
{"hasMoreResults":false,"pipelineIdList":[]}
...
*/

request(aws4.sign({ service: 'directconnect', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'OvertureService.DescribeConnections'
}}))
/*
{"connections":[]}
...
*/

request(aws4.sign({ service: 'opsworks', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'OpsWorks_20130218.DescribeInstances'
}}))
/*
{"Instances":[]}
...
*/

request(aws4.sign({ service: 'route53domains', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'Route53Domains_v20140515.ListDomains'
}}))
/*
{"Domains":[]}
...
*/

request(aws4.sign({ service: 'kinesis', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'Kinesis_20131202.ListStreams'
}}))
/*
{"HasMoreStreams":false,"StreamNames":[]}
...
*/

request(aws4.sign({ service: 'cloudtrail', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'CloudTrail_20131101.DescribeTrails'
}}))
/*
{"trailList":[]}
...
*/

request(aws4.sign({
  service: 'swf',
  body: '{"registrationStatus":"REGISTERED"}',
  headers: {
    'Content-Type': 'application/x-amz-json-1.0',
    'X-Amz-Target': 'SimpleWorkflowService.ListDomains'
  }
}))
/*
{"domainInfos":[]}
...
*/

request(aws4.sign({
  service: 'cognito-identity',
  body: JSON.stringify({
    Operation: 'com.amazonaws.cognito.identity.model#ListIdentityPools',
    Service: 'com.amazonaws.cognito.identity.model#AWSCognitoIdentityService',
    Input: {MaxResults: 1},
  }),
  headers: {
    'Content-Type': 'application/json',
    'X-Amz-Target': 'com.amazonaws.cognito.identity.model.AWSCognitoIdentityService.ListIdentityPools'
  }
}))
/*
{"Output":{"__type":"com.amazonaws.cognito.identity.model#ListIdentityPoolsResponse","IdentityPools":[],"NextToken":null},"Version":"1.0"}
...
*/

request(aws4.sign({
  service: 'mobileanalytics',
  path: '/2014-06-05/events',
  body: '{"events":[]}',
  headers: {
    'Content-Type': 'application/json',
  }
}))
/*
{"__type":"com.amazon.coral.validate#ValidationException","message":"1 validation error detected.
...
*/

// Still not updated to v4...

//request(aws4.sign({ service: 'route53', path: '/2013-04-01/hostedzone' }))

//request(aws4.sign({ service: 'importexport', path: '/?Action=ListJobs&Version=2010-06-01' }))

//request(aws4.sign({ service: 'sdb', path: '/?Action=ListDomains&Version=2009-04-15' }))

