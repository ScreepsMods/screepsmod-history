log(process.cwd())
const path = require('path')
const requireOpts = {
  paths: require.resolve.paths('@screeps/driver')
}
requireOpts.paths.push(path.resolve(process.cwd(), 'node_modules'))
const engine = require(require.resolve('@screeps/driver', requireOpts))
const common = require(require.resolve('@screeps/common', requireOpts))
const { StaticPool } = require('node-worker-threads-pool')
const Promise = require('bluebird')
const fs = require('fs')
const shared = require('./shared')

Promise.promisifyAll(fs)

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const KEEP_TICKS = process.env.HISTORY_KEEP_TICKS || 200000

function catchErr (fn) {
  return (...a) => fn(...a).catch(console.error)
}

async function run () {
  const pool = new StaticPool({
    size: require('os').cpus().length,
    task: path.join(__dirname, 'chunkBuilder.js')
  })
  const LIMIT = require('os').cpus().length * 2
  await engine.connect('historyWorker')
  const { db, pubsub, env } = common.storage
  pubsub.subscribe('roomsDone', catchErr(async (tick) => {
    const hcs = engine.config.historyChunkSize
    if (tick % hcs === 0) {
      let cnt = 0
      let total = 0
      const rooms = (await db.rooms.find()).map(r => r._id)
      const pending = new Set()
      for (let baseTick = tick; baseTick > tick - (hcs * 3); baseTick -= hcs) {
        const start = Date.now()
        if (shared.beginGroup) await shared.beginGroup()
        for (const room of rooms) {
          const key = `roomHistory:${baseTick}:${room}`
          const data = await env.get(key)
          if (!data) continue
          cnt++
          while (cnt > LIMIT) await sleep(10)
          const p = (async () => {
            const result = await pool.exec({ room, time: baseTick, data })
            await env.del(key)
            await shared.write(room, baseTick, result)
              .catch(err => error(`Error processing room ${room}@${baseTick}`, err))
            total++
            cnt--
            pending.delete(p)
          })()
          pending.add(p)
        }
        await Promise.all(Array.from(pending))
        if (shared.endGroup) await shared.endGroup()
        const end = Date.now()
        const dur = end - start
        log(`Saved ${total} rooms in ${dur}ms`)
      }
    }
    if (tick % 1000 === 0) {
      for (const room of rooms) {
        shared.cleanup(room, tick - KEEP_TICKS)
      }
    }
  }))
}

run().catch(console.error)

function log (...a) {
  console.log('[historyWorker]', ...a)
}
function error (...a) {
  console.error('[historyWorker]', ...a)
}

process.on('disconnect', () => process.exit())
log('started')
