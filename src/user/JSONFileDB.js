import DB from '../utils/DB'

import AbstractUserDB from './AbstractUserDB'

export default function JSONFileDB(config) {
  const {path, fileExtension} = config

  const database = new DB(path)

  class JSONFileDB extends AbstractUserDB {
    async login(username, password) {
      const userLogin = await database.getRow('user-login', username)
      if (userLogin.currentPassword === password) {
        const user = await database.getRow('user', userLogin.userId)
        return {userId: user.userId}
      }
      return null
    }

    async me(userToken) {
      const {userId} = userToken
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
      return me
    }

    // TODO: remove this api?
    async user(userToken) {
      const {userId} = userToken
      return database.getRow('users', userId)
    }

    async attachAccount(userToken, providers) {
      console.log('attachAccount', userToken, providers)

      const providerToUserId = {}
      const foundUserIds = {}
      await Promise.all(Object.entries(providers).map(async ([name, {profile}]) => {
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
      if (userToken === undefined) {
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
        targetUserId = userToken.userId
      }
      console.log('-> targetUserId', targetUserId)
      const user = targetUserId && await database.getRow('users', targetUserId) || ({id: await database.nextSequence('userId'), profiles: {}})
      console.log('-> user', user)
      await Promise.all(Object.entries(providers).map(async ([name, {profile, token}]) => {
        const {id} = profile
        const foundUserId = providerToUserId[name]
        if (foundUserId !== undefined) {
          if (foundUserId !== user.id) {
            // move the profile from the other user to this user
            const otherUser = await database.getRow('users', foundUserId)
            console.log('-> otherUser', otherUser)
            delete otherUser.profiles[name]
            delete otherUser.tokens[name]
            await database.setRow('users', foundUserId, otherUser)
            await database.setRow(`provider:${name}`, id, {userId: user.id})
          }
        } else {
          // no mapping for this provider, connect it
          await database.setRow(`provider:${name}`, id, {userId: user.id})
        }
        user.profiles[name] = profile
        user.tokens[name] = token
      }))
      await database.setRow('users', user.id, user)
      console.log('-> final user', user)
      return {userId: user.id}
    }

    async getProviderProfile(userToken, providerName) {
      const {userId} = userToken
      const user = await database.getRow('users', userId)
      return (user.profiles || {})[providerName]
    }

    async getProviderToken(userToken, providerName) {
      const {userId} = userToken
      const user = await database.getRow('users', userId)
      return (user.tokens || {})[providerName]
    }
  }

  return new JSONFileDB()
}

