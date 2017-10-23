const Promise = require('bluebird')
const fs = require('fs')
const AWS = require('aws')
const ini = require('ini')
const zlib = require('zlib')
const path = require('path')
const mkdirp = Promise.promisify(require('mkdirp'))

Promise.promisifyAll(fs)
Promise.promisifyAll(zlib)

const DEFAULTS = {
  mode: 'file',
  region: 'us-east-1',
  apiVersion: 'latest',
  accessKeyId: '',
  secretAccessKey: '',
  bucket: ''
}

let ENV = {
  mode: process.env.HISTORY_MODE,
  apiVersion: process.env.HISTORY_API_VERSION,
  region: process.env.HISTORY_REGION || process.env.AWS_DEFAULT_REGION,
  accessKeyId: process.env.HISTORY_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.HISTORY_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  bucket: process.env.HISTORY_BUCKET
}

let keys = Object.keys(ENV)
keys.forEach(key => {
  if(!ENV[key]) {
    delete ENV[key]
  }
})

let opts = {}
try {
  opts = ini.parse(fs.readFileSync('./.screepsrc', {encoding: 'utf8'}))
} catch (e) {}
opts.history = opts.history || {}
Object.assign(opts.history, DEFAULTS, opts.history, ENV)

class FileAdapter {
  getFilePath (room, tick) {
    return `${this.getRoomPath(room)}/${tick}.json.gz`
  }
  getRoomPath (room) {
    let base = process.env.HISTORY_PATH || `${path.dirname(process.env.MODFILE)}/history`
    return `${base}/${room}`
  }
  read (room, tick, callback) {
    const file = this.getFilePath(room, tick)
    return Promise.resolve()
      .then(data => fs.readFileAsync(file))
      .then(data => zlib.gunzipAsync(data, 'utf8'))
      .then(data => JSON.parse(data))
      .asCallback(callback)
  }
  write (room, tick, data, callback) {
    const file = this.getFilePath(room, tick)
    const dir = path.dirname(file)
    return mkdirp(dir)
      .then(() => data)
      .then(data => JSON.stringify(data))
      .then(data => zlib.gzipAsync(data))
      .then(data => fs.writeFileAsync(file, data))
      .asCallback(callback)
  }
}
class AWSAdapter {
  constructor (opts) {
    this.opts = opts
    this.s3 = new AWS.S3(opts)
  }
  getFilePath (room, tick) {
    return `history/${room}/${tick}.json.gz`
  }
  read (room, tick, callback) {
    const file = this.getFilePath(room, tick)
    return Promise.resolve()
      .then(data => this.s3.getObject({
        Bucket: this.opts.bucket,
        Key: file
      }))
      .then(data => data.Body.toString())
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
}
let adapters = {
  file: FileAdapter,
  aws: AWSAdapter
}

let Adapter = adapters[opts.history.mode]

module.exports = new Adapter(opts.history)
