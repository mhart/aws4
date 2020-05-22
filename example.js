var http = require('https')
var aws4  = require('.')

// to illustrate usage, we'll create a utility function to request and pipe to stdout
function request(opts) { http.request(opts, function(res) { res.pipe(process.stdout) }).end(opts.body || '') }

// aws4 will sign an options object as you'd pass to http.request, with an AWS service and region
var opts = { host: 'my-bucket.s3.us-west-1.amazonaws.com', path: '/my-object', service: 's3', region: 'us-west-1' }

// aws4.sign() will sign and modify these options, ready to pass to http.request
aws4.sign(opts, { accessKeyId: '', secretAccessKey: '' })

// or it can get credentials from process.env.AWS_ACCESS_KEY_ID, etc
aws4.sign(opts)

// for most AWS services, aws4 can figure out the service and region if you pass a host
opts = { host: 'my-bucket.s3.us-west-1.amazonaws.com', path: '/my-object' }

// usually it will add/modify request headers, but you can also sign the query:
opts = { host: 'my-bucket.s3.amazonaws.com', path: '/?X-Amz-Expires=12345', signQuery: true }

// and for services with simple hosts, aws4 can infer the host from service and region:
opts = { service: 'sqs', region: 'us-east-1', path: '/?Action=ListQueues' }

// and if you're using us-east-1, it's the default:
opts = { service: 'sqs', path: '/?Action=ListQueues' }

aws4.sign(opts)
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

// we can now use this to query AWS
request(opts)
/*
<?xml version="1.0"?>
<ListQueuesResponse xmlns="https://queue.amazonaws.com/doc/2012-11-05/">
...
*/

// aws4 can infer the HTTP method if a body is passed in
// method will be POST and Content-Type: 'application/x-www-form-urlencoded; charset=utf-8'
request(aws4.sign({ service: 'iam', body: 'Action=ListGroups&Version=2010-05-08' }))
/*
<ListGroupsResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
...
*/

// you can specify any custom option or header as per usual
request(aws4.sign({
  service: 'dynamodb',
  region: 'ap-southeast-2',
  method: 'POST',
  path: '/',
  headers: {
    'Content-Type': 'application/x-amz-json-1.0',
    'X-Amz-Target': 'DynamoDB_20120810.ListTables'
  },
  body: '{}'
}))
/*
{"TableNames":[]}
...
*/

// works with all other services that support Signature Version 4

request(aws4.sign({ service: 's3', path: '/', signQuery: true }))
/*
<ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
...
*/

request(aws4.sign({ service: 'ec2', path: '/?Action=DescribeRegions&Version=2014-06-15' }))
/*
<DescribeRegionsResponse xmlns="http://ec2.amazonaws.com/doc/2014-06-15/">
...
*/

request(aws4.sign({ service: 'sns', path: '/?Action=ListTopics&Version=2010-03-31' }))
/*
<ListTopicsResponse xmlns="http://sns.amazonaws.com/doc/2010-03-31/">
...
*/

request(aws4.sign({ service: 'sts', path: '/?Action=GetSessionToken&Version=2011-06-15' }))
/*
<GetSessionTokenResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
...
*/

request(aws4.sign({ service: 'cloudsearch', path: '/?Action=ListDomainNames&Version=2013-01-01' }))
/*
<ListDomainNamesResponse xmlns="http://cloudsearch.amazonaws.com/doc/2013-01-01/">
...
*/

request(aws4.sign({ service: 'ses', path: '/?Action=ListIdentities&Version=2010-12-01' }))
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

request(aws4.sign({ service: 'route53', path: '/2013-04-01/hostedzone' }))
/*
<ListHostedZonesResponse xmlns="https://route53.amazonaws.com/doc/2013-04-01/">
...
*/

request(aws4.sign({ service: 'cognito-sync', path: '/identitypools' }))
/*
{"Count":0,"IdentityPoolUsages":[],"MaxResults":16,"NextToken":null}
...
*/

request(aws4.sign({ service: 'elastictranscoder', path: '/2012-09-25/pipelines' }))
/*
{"NextPageToken":null,"Pipelines":[]}
...
*/

request(aws4.sign({ service: 'lambda', path: '/2014-11-13/functions/' }))
/*
{"Functions":[],"NextMarker":null}
...
*/

request(aws4.sign({ service: 'ecs', path: '/?Action=ListClusters&Version=2014-11-13' }))
/*
<ListClustersResponse xmlns="http://ecs.amazonaws.com/doc/2014-11-13/">
...
*/

request(aws4.sign({ service: 'glacier', path: '/-/vaults', headers: { 'X-Amz-Glacier-Version': '2012-06-01' } }))
/*
{"Marker":null,"VaultList":[]}
...
*/

request(aws4.sign({ service: 'storagegateway', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'StorageGateway_20120630.ListGateways'
} }))
/*
{"Gateways":[]}
...
*/

request(aws4.sign({ service: 'datapipeline', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'DataPipeline.ListPipelines'
} }))
/*
{"hasMoreResults":false,"pipelineIdList":[]}
...
*/

request(aws4.sign({ service: 'opsworks', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'OpsWorks_20130218.DescribeStacks'
} }))
/*
{"Stacks":[]}
...
*/

request(aws4.sign({ service: 'route53domains', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'Route53Domains_v20140515.ListDomains'
} }))
/*
{"Domains":[]}
...
*/

request(aws4.sign({ service: 'kinesis', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'Kinesis_20131202.ListStreams'
} }))
/*
{"HasMoreStreams":false,"StreamNames":[]}
...
*/

request(aws4.sign({ service: 'cloudtrail', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'CloudTrail_20131101.DescribeTrails'
} }))
/*
{"trailList":[]}
...
*/

request(aws4.sign({ service: 'logs', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'Logs_20140328.DescribeLogGroups'
} }))
/*
{"logGroups":[]}
...
*/

request(aws4.sign({ service: 'codedeploy', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'CodeDeploy_20141006.ListApplications'
} }))
/*
{"applications":[]}
...
*/

request(aws4.sign({ service: 'directconnect', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'OvertureService.DescribeConnections'
} }))
/*
{"connections":[]}
...
*/

request(aws4.sign({ service: 'kms', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'TrentService.ListKeys'
} }))
/*
{"Keys":[],"Truncated":false}
...
*/

request(aws4.sign({ service: 'config', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'StarlingDoveService.DescribeDeliveryChannels'
} }))
/*
{"DeliveryChannels":[]}
...
*/

request(aws4.sign({ service: 'cloudhsm', body: '{}', headers: {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'CloudHsmFrontendService.ListAvailableZones'
} }))
/*
{"AZList":["us-east-1a","us-east-1b","us-east-1c"]}
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
  body: '{"MaxResults": 1}',
  headers: {
    'Content-Type': 'application/x-amz-json-1.1',
    'X-Amz-Target': 'AWSCognitoIdentityService.ListIdentityPools'
  }
}))
/*
{"IdentityPools":[]}
...
*/

request(aws4.sign({
  service: 'mobileanalytics',
  path: '/2014-06-05/events',
  body: JSON.stringify({ events: [{
    eventType: 'a',
    timestamp: new Date().toISOString(),
    session: {},
  }] }),
  headers: {
    'Content-Type': 'application/json',
    'X-Amz-Client-Context': JSON.stringify({
      client: { client_id: 'a', app_title: 'a' },
      custom: {},
      env: { platform: 'a' },
      services: {},
    }),
  }
}))
/*
(HTTP 202, empty response)
*/
