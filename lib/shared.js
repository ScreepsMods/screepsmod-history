const fs = require('fs')
const ini = require('ini')

const DEFAULTS = {
  historyChunkSize: 20,
  mode: 'sqlite',
  region: 'us-east-1',
  apiVersion: 'latest',
  accessKeyId: '',
  secretAccessKey: '',
  bucket: '',
  path: 'history'
}

let ENV = {
  historyChunkSize: process.env.HISTORY_CHUNK_SIZE,
  mode: process.env.HISTORY_MODE,
  apiVersion: process.env.HISTORY_API_VERSION,
  region: process.env.HISTORY_REGION || process.env.AWS_DEFAULT_REGION,
  accessKeyId: process.env.HISTORY_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.HISTORY_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  bucket: process.env.HISTORY_BUCKET,
  path: process.env.HISTORY_PATH
}

let keys = Object.keys(ENV)
keys.forEach(key => {
  if (!ENV[key]) {
    delete ENV[key]
  }
})

let opts = {}
try {
  opts = ini.parse(fs.readFileSync('./.screepsrc', {encoding: 'utf8'}))
} catch (e) {}
opts.history = opts.history || {}
Object.assign(opts.history, DEFAULTS, opts.history, ENV)

let Adapter = require(`./adapters/${opts.history.mode || 'file'}`)

module.exports = new Adapter(opts.history)
