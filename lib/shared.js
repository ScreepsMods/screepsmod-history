const Promise = require('bluebird')
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')
const mkdirp = Promise.promisify(require('mkdirp'))

Promise.promisifyAll(fs)
Promise.promisifyAll(zlib)

function getFilePath (room, tick) {
  let base = process.env.HISTORY_PATH || `${path.dirname(process.env.MODFILE)}/history`
  return `${base}/${room}/${tick}.json.gz`
}

function read (room, tick, callback) {
  const file = getFilePath(room, tick)
  return Promise.resolve()
    .then(data => fs.readFileAsync(file))
    .then(data => zlib.gunzipAsync(data, 'utf8'))
    .then(data => JSON.parse(data))
    .asCallback(callback)
}

function write (room, tick, data, callback) {
  const file = getFilePath(room, tick)
  const dir = path.dirname(file)
  console.log('write', file, room, tick)
  return mkdirp(dir)
    .then(() => data)
    .then(data => JSON.stringify(data))
    .then(data => zlib.gzipAsync(data))
    .then(data => fs.writeFileAsync(file, data))
    .asCallback(callback)
}

module.exports = { read, write }
