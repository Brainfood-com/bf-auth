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
      Object.entries(user.profiles).map(([profileName, profile]) => {
      const {displayName, emails, photos} = profile
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
  app.post('/profile/:userId?', async (req, res) => {
    const {
      body: profiles,
      params: {userId},
    } = req
    console.log('POST:profile', userId, profiles)

    //console.log('profiles', profiles)
    const providerToUserId = {}
    const foundUserIds = {}
    await Promise.all(Object.entries(profiles).map(async ([name, profile]) => {
      const {id} = profile
      const foundUserRow = await database.getRow(`provider:${name}`, id)
      if (foundUserRow !== undefined) {
        const {userId: foundUserId} = foundUserRow
        providerToUserId[name] = foundUserId
        foundUserIds[foundUserId] = true
      }
    }))
    console.log('-> providerToUserId', providerToUserId)
    console.log('-> foundUserIds', foundUserIds)
    const foundUserIdList = Object.keys(foundUserIds)
    let targetUserId
    if (userId === undefined) {
      switch (foundUserIdList.length) {
        case 0:
          break
        case 1:
          targetUserId = foundUserIdList[0]
          break
        default:
          throw new Error('overlapping profiles')
      }
    } else {
      targetUserId = userId
    }
    console.log('-> targetUserId', targetUserId)
		const user = targetUserId && await database.getRow('users', targetUserId) || ({id: await database.nextSequence('userId'), profiles: {}})
    console.log('-> user', user)
    await Promise.all(Object.entries(profiles).map(async ([name, profile]) => {
      const {id} = profile
      const foundUserId = providerToUserId[name]
      if (foundUserId !== undefined) {
        if (foundUserId !== user.id) {
          // move the profile from the other user to this user
          const otherUser = await database.getRow('users', foundUserId)
          console.log('-> otherUser', otherUser)
          delete otherUser.profiles[name]
          await database.setRow('users', foundUserId, otherUser)
          await database.setRow(`provider:${name}`, id, {userId: user.id})
        }
      } else {
        // no mapping for this provider, connect it
        await database.setRow(`provider:${name}`, id, {userId: user.id})
      }
      user.profiles[name] = profile
    }))
    await database.setRow('users', user.id, user)
    res.send({userId: user.id})
  })
  /*
  app.delete('/profile/:id/:profileName', (req, res) => {
    console.log('DELETE:profile', req.params.id, req.params.profileName)
    res.status(500)
  })
  */

  return app
}
