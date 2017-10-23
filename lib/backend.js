module.exports = function (config) {
  config.backend.onGetRoomHistory = function (roomName, baseTime, callback) {
    console.log(config.history)
    config.history.read(roomName, baseTime, callback)
  }
}
