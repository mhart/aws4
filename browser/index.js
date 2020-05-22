var aws4 = require('aws4')

var CREDS = { accessKeyId: 'a', secretAccessKey: 'b' }

var sigs = {
  s3: aws4.sign({ host: 'my-bucket.s3.amazonaws.com', path: '/whatever?X-Amz-Expires=1234', signQuery: true }, CREDS),
  sqs: aws4.sign({ service: 'sqs' }, CREDS),
  codedeploy: aws4.sign({ service: 'codedeploy', body: '{}', headers: {
    'Content-Type': 'application/x-amz-json-1.1',
    'X-Amz-Target': 'CodeDeploy_20141006.ListApplications',
  } }, CREDS),
}

document.getElementById('content').innerHTML = JSON.stringify(sigs, null, 2)
