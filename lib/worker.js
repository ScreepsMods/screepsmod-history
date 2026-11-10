log(process.cwd())
const os = require('os')
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

function catchErr (fn) {
  return (...a) => fn(...a).catch(console.error)
}

function hasHistory (data) {
  return !!data && typeof data === 'object' && Object.keys(data).length > 0
}

function createWriteQueue () {
  let chain = Promise.resolve()
  return function enqueue (fn) {
    const run = chain.then(fn, fn)
    chain = run.then(() => {}, () => {})
    return run
  }
}

async function mapLimit (items, limit, fn) {
  if (!items.length || limit < 1) return
  let next = 0
  const runners = []
  const workers = Math.min(limit, items.length)
  for (let i = 0; i < workers; i++) {
    runners.push((async () => {
      while (next < items.length) {
        const item = items[next++]
        await fn(item)
      }
    })())
  }
  await Promise.all(runners)
}

async function flushChunk ({ rooms, env, pool, limit, baseTick }) {
  const enqueue = createWriteQueue()
  let saved = 0
  let opened = false
  try {
    await mapLimit(rooms, limit, async (room) => {
      const key = `roomHistory:${baseTick}:${room}`
      try {
        const result = await (async () => {
          const data = await env.get(key)
          if (!hasHistory(data)) return null
          return pool.exec({ room, time: baseTick, data })
        })()
        if (!result) return
        const wrote = await enqueue(async () => {
          if (!opened) {
            if (shared.beginGroup) await shared.beginGroup()
            opened = true
          }
          try {
            await shared.write(room, baseTick, result)
            return true
          } catch (err) {
            error(`Error processing room ${room}@${baseTick}`, err)
            return false
          }
        })
        if (wrote) {
          await env.del(key)
          saved++
        }
      } catch (err) {
        error(`Error processing room ${room}@${baseTick}`, err)
      }
    })
  } finally {
    if (opened && shared.endGroup) {
      await enqueue(() => shared.endGroup())
    }
  }
  if (saved) log(`Saved ${saved} rooms @ ${baseTick}`)
}

async function run () {
  const poolSize = os.cpus().length
  const pool = new StaticPool({
    size: poolSize,
    task: path.join(__dirname, 'chunkBuilder.js')
  })
  await engine.connect('historyWorker')
  const { db, pubsub, env } = common.storage
  let flushing = false
  pubsub.subscribe('roomsDone', catchErr(async (tick) => {
    const hcs = engine.config.historyChunkSize
    if (tick % hcs !== 0) return
    if (flushing) {
      log(`History flush still running, skipping tick ${tick}`)
      return
    }
    flushing = true
    try {
      const rooms = (await db.rooms.find()).map(r => r._id)
      for (let baseTick = tick; baseTick > tick - (hcs * 3); baseTick -= hcs) {
        await flushChunk({ rooms, env, pool, limit: poolSize, baseTick })
      }
    } finally {
      flushing = false
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
