import express from 'express'
import bodyParser from 'body-parser'

import {authMiddleware} from '../auth'
import touchSession from '../touchSession'

import JSONFileDB from './JSONFileDB'

export default function User() {
  const path = process.env.USER_STORE_PATH
  const fileExtension = process.env.USER_STORE_EXTENSION
  const app = express()

  app.locals.title = 'users'
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(touchSession())


  const database = new JSONFileDB({path, fileExtension})
  app.locals.database = database

  app.get('/me', async (req, res) => {
    const {user: userToken} = req
    console.log('user:/me', userToken)
    const me = await database.me(userToken)
    if (me) {
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

  if (false) {
  app.get('/user/:userId', async (req, res) => {
    const {params: {userId}} = req
    //console.log('GET:user', userId)
    res.send(await database.getRow('users', userId))
  })
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
  }
  return app
}
