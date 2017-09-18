const shared = require('./shared')

const EventEmitter = require('events').EventEmitter
module.exports = function (config) {
  config.history = new EventEmitter()
  Object.assign(config.history, shared)
}
