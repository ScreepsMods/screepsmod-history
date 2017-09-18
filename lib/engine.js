const childProcess = require('child_process')

module.exports = function engine (config) {
  const { env } = config.common.storage
  config.engine.on('init', function (processType) {
    if (processType === 'processor') {
      startWorker(config)
      config.engine.history.upload = (roomId, baseTime) => {
        return env.get(env.keys.ROOM_HISTORY + roomId)
          .then(data => config.history.worker.send({ method: 'upload', roomId, baseTime, data }))
          .then(() => env.del(env.keys.ROOM_HISTORY + roomId))
      }
    }
  })
}

function startWorker (config) {
  const child = childProcess.fork(`${__dirname}/worker.js`, [], {
    cwd: process.cwd(),
    stdio: ['ignore', process.stdout, process.stderr, 'ipc']
  })
  child.on('exit', () => startWorker(config))
  child.on('message', message => {
    config.history.emit('message', message)
  })
  config.history.worker = child
}
