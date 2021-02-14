const Promise = require('bluebird')
const AWS = require('aws-sdk')
const zlib = require('zlib')

Promise.promisifyAll(zlib)

class AWSAdapter {
  constructor (opts) {
    this.opts = opts
    this.s3 = new AWS.S3(opts)
  }
  getFilePath (room, tick) {
    return `${this.opts.path}/${room}/${tick}.json.gz`
  }
  read (room, tick, callback) {
    const file = this.getFilePath(room, tick)
    return Promise.resolve()
      .then(data => this.s3.getObject({
        Bucket: this.opts.bucket,
        Key: file
      }).promise())
      .then(data => data.Body)
      .then(data => zlib.gunzipAsync(data, 'utf8'))
      .then(data => JSON.parse(data))
      .asCallback(callback)
  }
  write (room, tick, data, callback) {
    const file = this.getFilePath(room, tick)
    return Promise.resolve(data)
      .then(data => JSON.stringify(data))
      .then(data => zlib.gzipAsync(data))
      .then(data => this.s3.putObject({
        Body: data,
        Bucket: this.opts.bucket,
        Key: file
      }).promise())
      .asCallback(callback)
  }
  cleanup (roomId, beforeTick) {
  }
}

module.exports = AWSAdapter
