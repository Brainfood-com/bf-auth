import express from 'express'
import bodyParser from 'body-parser'
import fse from 'fs-extra'
import path from 'path'

import {authMiddleware} from '../auth'

async function writeOneFile(targetName, fileContents) {
  console.log('writeOneFile', targetName, fileContents)
  const targetBaseName = path.basename(targetName)
  const targetDirName = path.dirname(targetName)
  await fse.mkdirs(targetDirName)
  await fse.writeFile(`${targetDirName}/${targetBaseName}.tmp`, fileContents)
  await fse.rename(`${targetDirName}/${targetBaseName}.tmp`, targetName)
}

export default function User({path, fileExtension = '.json'}) {
  const app = express()

  app.locals.title = 'users'
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))

  const databaseFile = path + fileExtension
  const databasePromise = new Promise(function(resolve, reject) {
    fse.exists(databaseFile).then(async result => {
      console.log('databaseFile exists', result)
      if (result) {
        const database = await fse.readFile(databaseFile).then(database => {
          database = JSON.parse(database)
          console.log('loaded database', database)
          resolve(database)
        }, reject)
      } else {
        return {
          userIdSequence: 0,
          users: {},
          idsByProvider: {},
        }
      }
    }, reject).then(resolve)
  })

  async function writeDatabase() {
    console.log('writeDatabase')
    const database = await databasePromise
    console.log('database', database)
    writeOneFile(databaseFile, JSON.stringify(database))
  }

  app.get('/me', authMiddleware(), async (req, res) => {
    const {user: {userId} = {}} = req
    console.log('user:/me', userId)
    if (userId !== undefined) {
	    const {users} = await databasePromise
    	const {[userId]: user} = users
      const me = {emails: {}}
      Object.entries(user.providers).map(([providerName, providerProfile]) => {
        const {displayName, emails, photos} = providerProfile
        console.log('emails', emails)
        if (emails) {
          emails.forEach(email => me.emails[email.value] = true)
        }
        if (!me.profilePic && photos) {
          me.profilePic = photos[0].value
        }
        if (!me.displayName && displayName) {
          me.displayName = displayName
        }
      })
      me.emails = Object.keys(me.emails).sort()
      console.log('me', me)
      res.send(me)
    } else {
      res.status(404).send('')
    }
  })

  app.get('/user/:userId', async (req, res) => {
    const {users} = await databasePromise
    const {params: {userId}} = req
    //console.log('GET:user', userId)
    res.send(users[userId])
  })
  /*
  app.post('/user/:id', (req, res) => {
    console.log('POST:user', req.params.id, req.body)
    res.status(500)
    res.send('foo')
  })
  */
  app.post('/provider/:userId?', async (req, res) => {
    const {
      body: account,
      params: {userId},
    } = req
    //console.log('POST:provider', userId, account)
    const {name, id, profile} = account
    const database = await databasePromise
    console.log('database', database)
    const {users, idsByProvider} = database
    const idByProvider = idsByProvider[name] || (idsByProvider[name] = {})

		const user = userId ? JSON.parse(JSON.stringify(users[userId])) : (users[database.userIdSequence] = {id: database.userIdSequence++, providers: {}})
    const existingProviderProfile = user.providers[name]
    if (existingProviderProfile) {
      const existingProviderId = idByProvider[existingProviderProfile.id]
      if (existingProviderId !== user.id) {
        const otherUser = users[existingProviderId]
        delete otherUser.providers[name]
        delete idByProvider[existingProviderProfile.id]
      }
    }
    user.providers[name] = profile
    idByProvider[id] = user.id
    users[user.id] = user
    console.log('-| result:', user)
    try {
      await writeDatabase()
    } catch (e) {
      console.error(e)
      res.error(e)
    }
    res.send({userId: user.id})
  })
  /*
  app.delete('/provider/:id/:providerName', (req, res) => {
    console.log('DELETE:provider', req.params.id, req.params.providerName)
    res.status(500)
  })
  */

  return app
}
