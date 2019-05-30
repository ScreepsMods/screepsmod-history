const shared = require('./shared')

module.exports = function (config) {
  config.backend.historyChunkSize = config.history.opts.historyChunkSize
  config.backend.onGetRoomHistory = function (roomName, baseTime, callback) {
    shared.read(roomName, baseTime, callback)
  }
}
