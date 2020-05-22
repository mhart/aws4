Browser aws4 example
--------------------

This is one way to use `aws4` in the browser – using [browserify](http://browserify.org/).

The example JS code that uses `aws4` is in `index.js`:

```js
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
```

To compile this, checkout this directory and run:

```console
$ npm install
$ npm run build
```

Then open `index.html` where you should see the signed requests that were specified in `index.js`

