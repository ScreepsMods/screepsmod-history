module.exports = function (config) {
  config.backend.onGetRoomHistory = function (roomName, baseTime, callback) {
    config.history.read(roomName, baseTime, callback)
  }
}
