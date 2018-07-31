require('dotenv').config()
const moment = require('moment')
const qs = require('querystring')
const mongoose = require('mongoose')

// =============================================================================
// DB CONNECTION DETAILS
const dbUser = process.env.EXPORT_STATS_MONGO_USER
const dbPwd = process.env.EXPORT_STATS_MONGO_PWD
const dbHost = process.env.EXPORT_STATS_MONGO_HOST
const dbPort = process.env.EXPORT_STATS_MONGO_PORT
const dbDb = process.env.EXPORT_STATS_MONGO_DB
const dbConn = `mongodb://${dbUser}:${dbPwd}@${dbHost}:${dbPort}/${dbDb}`

// =============================================================================
// SCHEMA FOR AN EXPORT RECORD
const Schema = mongoose.Schema
const exportSchema = new Schema({
  date: { type: Date, default: Date.now },
  exportSuccessful: Boolean,
  month: Number,
  week: Number,
  weekDay: String
})
const Export = mongoose.model('Export', exportSchema)

const today = moment()
const now = moment()
let date = today.clone().subtract(1, 'd')

// =============================================================================
// CHECK FOR AN EXISTING RECORD IN THE DATABASE
const checkForExistingRecord = async (date) => {
  const _start = date.clone().utc().startOf('day')
  const _end = date.clone().utc().endOf('day')

  const exArr = await Export.find({date: { $gte: _start, $lte: _end }})
  const existsAlready = exArr.length
  console.log(`existsAlready: ${existsAlready}, start: ${_start}, end: ${_end}`)
  return existsAlready > 0
}

// =============================================================================
// SAVE A NEW RECORD IN THE DATABASE
const saveNewRecord = async (payload) => {
  const exportSuccessful = (payload.actions[0].value === 'ok')
  const userId = payload.user.id

  const responseMsg = exportSuccessful
    ? `Great! :+1: Thanks a lot`
    : `Hmmm, this smells like a PDCA! :wink: Thanks anyway`
  const responseDate = (now.day() <= 1 || now.day() > 5) ? 'Friday' : 'yesterday'
  const resMsg = `${responseMsg} <@${userId}>, ${responseDate}'s export has been successfully recorded. <https://jfix.github.io/export-stats/|Find out more>.`
  const errMsg = `Really sorry but for some weird reason I couldn't save the export. Please see an administrator with this info:`

  console.log(`About to add document to database ...`)
  // prepare the data to save in the database
  const anExport = new Export({
    date: date.toDate(),
    exportSuccessful: exportSuccessful,
    month: date.month(),
    week: date.week(),
    weekDay: date.format('ddd')
  })
  const res = await anExport.save()
  console.log(`SAVED EXPORT RES: ${JSON.stringify(res)}`)
  if (res) {
    console.log(`Successfully saved document in database.`)
    // response.end(resMsg)
  } else {
    console.log(`Error while saving: ${JSON.stringify(res)}`)
    // response.statusCode = 500
    // response.end(`${errMsg} ${JSON.stringify(res)}`)
  }
  console.log('Finished interaction, database is now closed. Good-bye!')
  // }) // request handling
}

const addExport = async (request, response) => {
// exports.endpoint = async (request, response) => {

  if (today.day() <= 1 || today.day() > 5) {
    date = today.clone().day(-2)
  }
  try {
    mongoose.connect(dbConn, { useNewUrlParser: true })
    const db = mongoose.connection
    db.on('error', (err) => console.log(`connection error: ${err}`))
    db.once('open', async () => {
      console.log(`DB IS OPEN!`)
      if (await checkForExistingRecord(date)) {
        // don't save document if there is already one with the same date
        console.log(`Not adding document to database (already one with ${date.toDate()} in the db).`)
        db.close()
        // response.end(resMsg)
        return
      }
      // return request.on('end', () => {
      const payload = {'user': {'id': 'TESTUSER'}, 'actions': [{'value': 'ok'}]}
      await saveNewRecord(payload)
      db.close()
    }) // db open
  } catch (err) {
    console.log(`CATCH: ${JSON.stringify(err)}`)
    // return (err) => response.status(500).json({ error: err })
  }
}
addExport({}, {})
