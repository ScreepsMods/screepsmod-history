const Promise = require('bluebird')
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')
const mkdirp = Promise.promisify(require('mkdirp'))

Promise.promisifyAll(fs)
Promise.promisifyAll(zlib)

function getFilePath (room, tick) {
  return `./history/${room}/${tick}.json.gz`
}

function read (room, tick, callback) {
  const file = getFilePath(room, tick)
  return Promise.resolve()
    .then(data => fs.readFileAsync(file, 'utf8'))
    .then(data => zlib.gunzipAsync(data))
    .then(data => JSON.parse(data))
    .asCallback(callback)
}

function write (room, tick, data, callback) {
  const file = getFilePath(room, tick)
  const dir = path.dirname(file)
  return mkdirp(dir)
    .then(data => JSON.stringify(data))
    .then(data => zlib.gzipAsync(data))
    .then(data => fs.writeFileAsync(file, 'utf8'))
    .asCallback(callback)
}

module.exports = { read, write }
