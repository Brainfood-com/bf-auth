import express from 'express'
import bodyParser from 'body-parser'
import fse from 'fs-extra'
import path from 'path'

import {authMiddleware} from '../auth'
import DB from '../utils/DB'
import touchSession from '../touchSession'

async function writeOneFile(targetName, fileContents) {
  console.log('writeOneFile', targetName, fileContents)
  const targetBaseName = path.basename(targetName)
  const targetDirName = path.dirname(targetName)
  await fse.mkdirs(targetDirName)
  await fse.writeFile(`${targetDirName}/${targetBaseName}.tmp`, fileContents)
  await fse.rename(`${targetDirName}/${targetBaseName}.tmp`, targetName)
}

export default function User() {
  const path = process.env.USER_STORE_PATH
  const fileExtension = process.env.USER_STORE_EXTENSION
  const app = express()

  app.locals.title = 'users'
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(touchSession())

  const database = new DB(path)

  app.get('/me', authMiddleware(), async (req, res) => {
    const {user: {userId} = {}} = req
    console.log('user:/me', userId)
    if (userId !== undefined) {
      const user = await database.getRow('users', userId)
      const me = {userId, emails: {}}
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
      res.status(404)
      if (req.accepts('application/json')) {
        res.send({})
      } else {
        res.send('')
      }
    }
  })

  app.get('/user/:userId', async (req, res) => {
    const {params: {userId}} = req
    //console.log('GET:user', userId)
    res.send(await database.getRow('users', userId))
  })
  /*
  app.post('/user/:id', (req, res) => {
    console.log('POST:user', req.params.id, req.body)
    res.status(500)
    res.send('foo')
  })
  */
  app.post('/user', async (req, res) => {
    const {username, password} = req.body
    const userLogin = await database.getRow('user-login', username)
    if (userLogin.currentPassword === password) {
      res.send(await database.getRow('user', userLogin.userId))
    }
    res.send({}).status(404)
  })
  app.post('/provider/:userId?', async (req, res) => {
    const {
      body: account,
      params: {userId},
    } = req
    //console.log('POST:provider', userId, account)
    const {name, id, profile} = account
    const idByProvider = await database.getRow('providers', name).then(data => data || {})

		const user = userId && await database.getRow('users', userId) || ({id: await database.nextSequence('userId'), providers: {}})
    const existingProviderProfile = user.providers[name]
    if (existingProviderProfile) {
      const existingProviderId = idByProvider[existingProviderProfile.id]
      if (existingProviderId !== user.id) {
        const otherUser = await database.getRow('users', existingProviderId)
        delete otherUser.providers[name]
        await database.setRow('users', existingProviderId)
        delete idByProvider[existingProviderProfile.id]
      }
    }
    user.providers[name] = profile
    idByProvider[id] = user.id
    console.log('-| result:', user)
    await database.setRow('providers', name, idByProvider)
    await database.setRow('users', user.id, user)
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
