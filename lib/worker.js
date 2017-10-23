const _ = require('lodash')
const shared = require('./shared')
const Promise = require('bluebird')
const fs = require('fs')

Promise.promisifyAll(fs)

const handlers = { upload, cleanup }

process.on('message', message => {
  const func = handlers[message.method]
  if (func) {
    func(message)
  }
})
function log (...a) {
  console.log('[historyWorker]', ...a)
}
function error (...a) {
  console.error('[historyWorker]', ...a)
}

process.on('disconnect', () => process.exit())
log('started')

// Based on screeos/driver/lib/history.js
function upload ({ roomId, baseTime, data }) {
  log('upload', roomId, baseTime)
  if (!data || !data['' + baseTime]) {
    return
  }

  let curTick = baseTime
  let curObjects = JSON.parse(data['' + baseTime])
  const result = {
    timestamp: Date.now(),
    room: roomId,
    base: curTick,
    ticks: {
      [curTick]: curObjects
    }
  }

  curTick++
  while (data['' + curTick]) {
    let objects = JSON.parse(data['' + curTick])
    let diff = getDiff(curObjects, objects)
    result.ticks[curTick] = diff
    curObjects = objects
    curTick++
  }

  shared.write(roomId, baseTime, result)
    .catch(err => error(`Error processing room ${roomId}@${baseTime}`, err))
}

// Copied from screeps/common/index.js
function getDiff (oldData, newData) {
  function getIndex (data) {
    let index = {}
    _.forEach(data, (obj) => (index[obj._id] = obj))
    return index
  }

  let result = {}
  let oldIndex = getIndex(oldData)
  let newIndex = getIndex(newData)

  _.forEach(oldData, (obj) => {
    if (newIndex[obj._id]) {
      let newObj = newIndex[obj._id]
      let objDiff = result[obj._id] = {}
      for (let key in obj) {
        if (_.isUndefined(newObj[key])) {
          objDiff[key] = null
        } else if ((typeof obj[key]) !== (typeof newObj[key]) || (obj[key] && !newObj[key])) {
          objDiff[key] = newObj[key]
        } else if (_.isObject(obj[key])) {
          objDiff[key] = {}

          for (let subkey in obj[key]) {
            if (!_.isEqual(obj[key][subkey], newObj[key][subkey])) {
              objDiff[key][subkey] = newObj[key][subkey]
            }
          }
          for (let subkey in newObj[key]) {
            if (_.isUndefined(obj[key][subkey])) {
              objDiff[key][subkey] = newObj[key][subkey]
            }
          }
          if (!_.size(objDiff[key])) {
            delete result[obj._id][key]
          }
        } else if (!_.isEqual(obj[key], newObj[key])) {
          objDiff[key] = newObj[key]
        }
      }
      for (let key in newObj) {
        if (_.isUndefined(obj[key])) {
          objDiff[key] = newObj[key]
        }
      }
      if (!_.size(objDiff)) {
        delete result[obj._id]
      }
    } else {
      result[obj._id] = null
    }
  })

  _.forEach(newData, (obj) => {
    if (!oldIndex[obj._id]) {
      result[obj._id] = obj
    }
  })

  return result
}

function cleanup ({ roomId, beforeTick }) {
  const dir = shared.getRoomPath(roomId)
  fs.readdirAsync(dir)
    .filter(file => file.match(/(\d+).json.gz$/))
    .filter(file => parseInt(file.match(/(\d+).json.gz$/)[1]) < beforeTick)
    .map(file => fs.unlinkAsync(file))
}
