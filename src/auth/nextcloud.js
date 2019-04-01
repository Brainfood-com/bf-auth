// == local
import express from 'express'
import { Strategy as NextcloudStrategy } from '../passport-nextcloud'

import fixOAuth2CallbackURL from './fixOAuth2CallbackURL'

export function build(name, {passport, userDb}, resultHandler) {
  const nameUpper = name.toUpperCase()
  passport.use(name, new (fixOAuth2CallbackURL(NextcloudStrategy))({
    nextcloudBaseURL: process.env[`${nameUpper}_BASE_URL`],
    clientID: process.env[`${nameUpper}_CLIENT_ID`],
    clientSecret: process.env[`${nameUpper}_CLIENT_SECRET`],
    callbackURL: 'callback',
  }, (accessToken, refreshToken, params, profile, done) => {
    //console.log('nextcloud check', {accessToken, refreshToken, params, profile, done})
    return done(null, {name, id: profile.id, profile, accessToken, refreshToken})
    //userDb.attachProvider(name, profile.id, profile).then(user => done(null, user)).catch(done)
  }))

  const app = express()
  app.locals.provider = 'nextcloud'
  app.locals.title = 'Nextcloud'
  app.use((req, res, next) => {
    next()
  })
  app.get('/', passport.authenticate(name))
  app.get('/callback', passport.authorize(name), resultHandler)
  return app
}
