const childProcess = require('child_process')

const KEEP_TICKS = process.env.HISTORY_KEEP_TICKS || 200000

module.exports = function engine (config) {
  const { env } = config.common.storage
  config.engine.historyChunkSize = config.history.opts.historyChunkSize
  config.engine.on('init', function (processType) {
    if (processType === 'main') {
      startWorker(config)
    }
    if (processType === 'processor') {
      config.engine.driver.history.saveTick = async (roomId, gameTime, data) => {
        const baseTime = gameTime - gameTime % config.engine.historyChunkSize
        const key = env.keys.ROOM_HISTORY + `${baseTime}:${roomId}`
        await env.hmset(key, { [gameTime]: data })
        await env.expire(key, 60 * config.engine.historyChunkSize)
      }
      config.engine.driver.history.upload = async (roomId, baseTime) => {
        // Do nothing other than cleanup, hooking roomDone to trigger actual saving
        if (baseTime % 1000 === 0) {
          console.log(`cleaning up history before ${baseTime - KEEP_TICKS}`)
          await config.history.shared.cleanup(roomId, baseTime - KEEP_TICKS)
        }
      }
    }
  })
}

function startWorker (config) {
  const child = childProcess.fork(`${__dirname}/worker.js`, [], {
    // cwd: process.cwd(),
    execArgv: ['--experimental-worker'],
    env: process.env,
    stdio: ['ignore', process.stdout, process.stderr, 'ipc']
  })
  child.on('exit', () => startWorker(config))
  child.on('message', message => {
    config.history.emit('message', message)
  })
  config.history.worker = child
}
