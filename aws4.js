var aws4   = exports
var crypto = require('crypto')

// http://docs.amazonwebservices.com/general/latest/gr/signature-version-4.html

// request: { path | body, [host], [method], [headers], [service], [region] }
// credentials: { accessKeyId, secretAccessKey, [sessionToken] }
function RequestSigner(request, credentials) {
  var headers = request.headers || {}
    , hostParts = this.matchHost(request.hostname || request.host || headers['Host'])
    , date = new Date(headers['Date'] || new Date)

  this.request = request
  this.credentials = credentials || this.defaultCredentials()

  this.service = request.service || hostParts[0] || ''
  this.region = request.region || hostParts[1] || 'us-east-1'
  this.datetime = date.toISOString().replace(/[:\-]|\.\d{3}/g, '')
  this.date = this.datetime.substr(0, 8)
}

RequestSigner.prototype.matchHost = function(host) {
  var match = (host || '').match(/^([^\.]+)\.?([^\.]*)\.amazonaws\.com$/)
  return (match || []).slice(1, 3)
}

RequestSigner.prototype.createHost = function() {
  var region = ~['iam', 'sts'].indexOf(this.service) ? '' : '.' + this.region
  return this.service + region + '.amazonaws.com'
}

RequestSigner.prototype.sign = function() {
  var request = this.request
    , headers = request.headers = (request.headers || {})

  if (!request.method && request.body)
    request.method = 'POST'

  if (!headers['Host'])
    headers['Host'] = request.hostname || request.host || this.createHost()
  if (!request.hostname && !request.host)
    request.hostname = headers['Host']

  if (request.body && !headers['Content-Type'])
    headers['Content-Type'] = 'application/x-www-form-urlencoded'

  headers['X-Amz-Date'] = this.datetime

  if (this.credentials.sessionToken)
    headers['X-Amz-Security-Token'] = this.credentials.sessionToken

  headers['Authorization'] = this.authHeader()

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
  function hmac(key, data, encoding) {
    return crypto.createHmac('sha256', key).update(data).digest(encoding)
  }
  var kDate = hmac('AWS4' + this.credentials.secretAccessKey, this.date)
  var kRegion = hmac(kDate, this.region)
  var kService = hmac(kRegion, this.service)
  var kCredentials = hmac(kService, 'aws4_request')
  return hmac(kCredentials, this.stringToSign(), 'hex')
}

RequestSigner.prototype.stringToSign = function() {
  return [
    'AWS4-HMAC-SHA256',
    this.datetime,
    this.credentialString(),
    crypto.createHash('sha256').update(this.canonicalString()).digest('hex')
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
    crypto.createHash('sha256').update(this.request.body || '').digest('hex')
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
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || env.AWS_SECRET_KEY
  }
}

aws4.RequestSigner = RequestSigner

aws4.sign = function(request, credentials) {
  return new RequestSigner(request, credentials).sign()
}
