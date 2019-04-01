// == local
import express from 'express'
import { Strategy as OAuth2Strategy } from 'passport-oauth2'

import fixOAuth2CallbackURL from './fixOAuth2CallbackURL'

export function build(name, {passport, userDb}, resultHandler) {
  passport.use(name, new (fixOAuth2CallbackURL(OAuth2Strategy))({
    authorizationURL: process.env.OAUTH2_AUTHORIZATION_URL,
    tokenURL: process.env.OAUTH2_TOKEN_URL,
    clientID: process.env.OAUTH2_CLIENT_ID,
    clientSecret: process.env.OAUTH2_CLIENT_SECRET,
    callbackURL: 'callback',
  }, (accessToken, refreshToken, params, profile, done) => {
    console.log('local check', {accessToken, refreshToken, params, profile, done})
    userDb.findOrCreate({}, done)
  }))

  const app = express()
  app.use((req, res, next) => {
    next()
  })
  app.get('/', passport.authenticate(name))
  app.get('/callback', passport.authenticate(name), resultHandler)
  return app
}
