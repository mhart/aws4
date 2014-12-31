var aws4 = exports,
    url = require('url'),
    crypto = require('crypto'),
    lru = require('lru-cache'),
    credentialsCache = lru(1000)

// http://docs.amazonwebservices.com/general/latest/gr/signature-version-4.html

function hmac(key, string, encoding) {
  return crypto.createHmac('sha256', key).update(string, 'utf8').digest(encoding)
}

function hash(string, encoding) {
  return crypto.createHash('sha256').update(string, 'utf8').digest(encoding)
}

// request: { path | body, [host], [method], [headers], [service], [region] }
// credentials: { accessKeyId, secretAccessKey, [sessionToken] }
function RequestSigner(request, credentials) {

  if (typeof request === 'string') request = url.parse(request)

  var headers = request.headers || {},
      hostParts = this.matchHost(request.hostname || request.host || headers.Host)

  this.request = request
  this.credentials = credentials || this.defaultCredentials()

  this.service = request.service || hostParts[0] || ''
  this.region = request.region || hostParts[1] || 'us-east-1'

  // SES uses a different domain from the service name
  if (this.service === 'email') this.service = 'ses'
}

RequestSigner.prototype.matchHost = function(host) {
  var match = (host || '').match(/^([^\.]+)\.?([^\.]*)\.amazonaws\.com$/)
  return (match || []).slice(1, 3)
}

// http://docs.aws.amazon.com/general/latest/gr/rande.html
RequestSigner.prototype.isSingleRegion = function() {
  // Special case for S3 and SimpleDB in us-east-1
  if (['s3', 'sdb'].indexOf(this.service) >= 0 && this.region === 'us-east-1') return true

  return ['cloudfront', 'ls', 'route53', 'iam', 'importexport', 'sts']
    .indexOf(this.service) >= 0
}

RequestSigner.prototype.createHost = function() {
  var region = this.isSingleRegion() ? '' : '.' + this.region,
      service = this.service === 'ses' ? 'email' : this.service
  return service + region + '.amazonaws.com'
}

RequestSigner.prototype.sign = function() {
  var request = this.request,
      headers = request.headers = (request.headers || {}),
      date = new Date(headers.Date || new Date)

  this.datetime = date.toISOString().replace(/[:\-]|\.\d{3}/g, '')
  this.date = this.datetime.substr(0, 8)

  if (!request.method && request.body)
    request.method = 'POST'

  if (!headers.Host && !headers.host)
    headers.Host = request.hostname || request.host || this.createHost()
  if (!request.hostname && !request.host)
    request.hostname = headers.Host || headers.host

  if (request.body && !headers['Content-Type'] && !headers['content-type'])
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=utf-8'

  if (request.body && !headers['Content-Length'] && !headers['content-length'])
    headers['Content-Length'] = Buffer.byteLength(request.body)

  headers['X-Amz-Date'] = this.datetime

  if (this.credentials.sessionToken)
    headers['X-Amz-Security-Token'] = this.credentials.sessionToken

  if (this.service === 's3')
    headers['X-Amz-Content-Sha256'] = hash(this.request.body || '', 'hex')

  if (headers.Authorization) delete headers.Authorization
  headers.Authorization = this.authHeader()

  return request
}

RequestSigner.prototype.authHeader = function() {
  return [
    'AWS4-HMAC-SHA256 Credential=' + this.credentials.accessKeyId + '/' + this.credentialString(),
    'SignedHeaders=' + this.signedHeaders(),
    'Signature=' + this.signature()
  ].join(', ')
}

RequestSigner.prototype.signature = function() {
  var cacheKey = [this.credentials.secretAccessKey, this.date, this.region, this.service].join(),
      kDate, kRegion, kService, kCredentials = credentialsCache.get(cacheKey)
  if (!kCredentials) {
    kDate = hmac('AWS4' + this.credentials.secretAccessKey, this.date)
    kRegion = hmac(kDate, this.region)
    kService = hmac(kRegion, this.service)
    kCredentials = hmac(kService, 'aws4_request')
    credentialsCache.set(cacheKey, kCredentials)
  }
  return hmac(kCredentials, this.stringToSign(), 'hex')
}

RequestSigner.prototype.stringToSign = function() {
  return [
    'AWS4-HMAC-SHA256',
    this.datetime,
    this.credentialString(),
    hash(this.canonicalString(), 'hex')
  ].join('\n')
}

RequestSigner.prototype.canonicalString = function() {
  var pathParts = (this.request.path || '/').split('?', 2)
  return [
    this.request.method || 'GET',
    pathParts[0] || '/',
    pathParts[1] || '',
    this.canonicalHeaders() + '\n',
    this.signedHeaders(),
    hash(this.request.body || '', 'hex')
  ].join('\n')
}

RequestSigner.prototype.canonicalHeaders = function() {
  var headers = this.request.headers
  function trimAll(header) {
    return header.toString().trim().replace(/\s+/g, ' ')
  }
  return Object.keys(headers)
    .sort(function(a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1 })
    .map(function(key) { return key.toLowerCase() + ':' + trimAll(headers[key]) })
    .join('\n')
}

RequestSigner.prototype.signedHeaders = function() {
  return Object.keys(this.request.headers)
    .map(function(key) { return key.toLowerCase() })
    .sort()
    .join(';')
}

RequestSigner.prototype.credentialString = function() {
  return [
    this.date,
    this.region,
    this.service,
    'aws4_request'
  ].join('/')
}

RequestSigner.prototype.defaultCredentials = function() {
  var env = process.env
  return {
    accessKeyId:     env.AWS_ACCESS_KEY_ID     || env.AWS_ACCESS_KEY,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || env.AWS_SECRET_KEY,
    sessionToken:    env.AWS_SESSION_TOKEN
  }
}

aws4.RequestSigner = RequestSigner

aws4.sign = function(request, credentials) {
  return new RequestSigner(request, credentials).sign()
}
