const Promise = require('bluebird')
const fs = require('fs')
const path = require('path')
const mkdirp = Promise.promisify(require('mkdirp'))
const zlib = require('zlib')

Promise.promisifyAll(fs)
Promise.promisifyAll(zlib)

class FileAdapter {
  constructor (opts) {
    this.opts = opts
  }
  getFilePath (room, tick) {
    return `${this.getRoomPath(room)}/${tick}.json.gz`
  }
  getRoomPath (room) {
    let base = path.resolve(path.dirname(process.env.MODFILE), this.opts.path)
    return `${base}/${room}`
  }
  read (room, tick, callback) {
    const file = this.getFilePath(room, tick)
    if (!fs.existsSync(file)) {
      return Promise.resolve().asCallback(callback)
    }
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
  cleanup (roomId, beforeTick) {
    const dir = this.getRoomPath(roomId)
    fs.readdirAsync(dir)
      .filter(file => file.match(/(\d+).json.gz$/))
      .filter(file => parseInt(file.match(/(\d+).json.gz$/)[1]) < beforeTick)
      .map(file => fs.unlinkAsync(path.join(dir, file)))
  }
}

module.exports = FileAdapter
