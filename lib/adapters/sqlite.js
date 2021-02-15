const { Sequelize, Model, DataTypes, Op } = require('sequelize')
const zlib = require('zlib')
const util = require('util')

const gzip = util.promisify(zlib.gzip)
const gunzip = util.promisify(zlib.gunzip)

class History extends Model { }

class SqliteAdapter {
  constructor (opts) {
    this.opts = opts
    const { path = 'history', file = `${path}.db` } = opts
    const sequelize = new Sequelize(`sqlite:${file}`, {
      logging: false
    })
    this.sequelize = sequelize
    this.trans = undefined

    History.init({
      room: DataTypes.STRING,
      tick: DataTypes.INTEGER,
      data: DataTypes.BLOB
    }, {
      sequelize,
      modelName: 'history',
      indexes: [
        { fields: ['room'] },
        { unique: true, fields: ['room', 'tick'] }
      ]
    })
    sequelize.sync()
  }
  async beginGroup () {
    this.trans = await this.sequelize.transaction()
  }
  async endGroup () {
    this.trans.commit()
    this.trans = undefined
  }
  async read (room, tick, callback) {
    try {
      const record = await History.findOne({ where: { room, tick } })
      if (!record) {
        throw new Error('Record not found')
      }
      const data = JSON.parse(await gunzip(record.data, 'utf8'))
      if (typeof callback === 'function') callback(null, data)
      return data
    } catch (e) {
      if (typeof callback === 'function') callback(e)
      else throw e
    }
  }
  async write (room, tick, data, callback) {
    try {
      await History.create({
        room,
        tick,
        data: await gzip(JSON.stringify(data))
      }, { transaction: this.trans })
      if (typeof callback === 'function') callback()
    } catch (e) {
      if (typeof callback === 'function') callback(e)
      else throw e
    }
  }
  cleanup (room, beforeTick) {
    return History.destroy({ where: { room, tick: { [Op.lt]: beforeTick } } })
  }
}

module.exports = SqliteAdapter
