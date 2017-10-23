const shared = require('./shared')

module.exports = function (config) {
  config.backend.onGetRoomHistory = function (roomName, baseTime, callback) {
    shared.write(roomName, baseTime, callback)
  }
}
