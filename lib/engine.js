const childProcess = require('child_process')

const KEEP_TICKS = process.env.HISTORY_KEEP_TICKS || 50000

module.exports = function engine (config) {
  const { env } = config.common.storage
  config.engine.on('init', function (processType) {
    if (processType === 'processor') {
      startWorker(config)
      config.engine.driver.history.upload = (roomId, baseTime) => {
        return env.get(env.keys.ROOM_HISTORY + roomId)
          .then(data => config.history.worker.send({ method: 'upload', roomId, baseTime, data }))
          .then(() => env.del(env.keys.ROOM_HISTORY + roomId))
          .then(() => {
            if (baseTime % 1000) {
              config.history.worker.send({ method: 'cleanup', roomId, beforeTick: baseTime - KEEP_TICKS })
            }
          })
      }
    }
  })
}

function startWorker (config) {
  const child = childProcess.fork(`${__dirname}/worker.js`, [], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', process.stdout, process.stderr, 'ipc']
  })
  child.on('exit', () => startWorker(config))
  child.on('message', message => {
    config.history.emit('message', message)
  })
  config.history.worker = child
}
