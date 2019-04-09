// == local
import express from 'express'
import { Strategy as NextcloudStrategy } from '../passport-nextcloud'

import fixOAuth2CallbackURL from './fixOAuth2CallbackURL'

export function build(name, {passport, userDb}) {
  const nameUpper = name.toUpperCase()
  passport.use(name, new (fixOAuth2CallbackURL(NextcloudStrategy))({
    nextcloudBaseURL: process.env[`${nameUpper}_BASE_URL`],
    clientID: process.env[`${nameUpper}_CLIENT_ID`],
    clientSecret: process.env[`${nameUpper}_CLIENT_SECRET`],
    callbackURL: 'callback',
  }, (accessToken, refreshToken, params, profile, done) => {
    return done(null, {name, profile, accessToken, refreshToken})
  }))

  const app = express()
  app.locals.provider = 'nextcloud'
  app.locals.title = 'Nextcloud'
  app.locals.popup = {width: 500, height: 270}
  app.get('/', passport.authenticate(name))
  app.get('/callback', passport.authorize(name))
  return app
}
