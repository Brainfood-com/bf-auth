import express from 'express'
import { Strategy as FacebookStrategy } from 'passport-facebook'

import fixOAuth2CallbackURL from './fixOAuth2CallbackURL'

export function build(name, {passport, userDb}, resultHandler) {
  const nameUpper = name.toUpperCase()
  passport.use(name, new (fixOAuth2CallbackURL(FacebookStrategy))({
    clientID: process.env[`${nameUpper}_APP_ID`],
    clientSecret: process.env[`${nameUpper}_APP_SECRET`],
    callbackURL: 'callback',
    proxy: true,
    scope: ['public_profile', 'email'],
    profileFields: ['id', 'displayName', 'name', 'gender', 'birthday', 'profileUrl', 'emails', 'photos'],
  }, (accessToken, refreshToken, params, profile, done) => {
    //console.log('facebook check', {accessToken, refreshToken, params, profile, done})
    return done(null, {name, id: profile.id, profile, accessToken, refreshToken})
    //userDb.attachProvider(name, profile.id, profile).then(user => done(null, user)).catch(done)
  }))

  const app = express()
  app.locals.provider = 'facebook'
  app.locals.title = 'Facebook'
  app.use((req, res, next) => {
    next()
  })
  app.get('/', passport.authenticate(name, {authType: 'rerequest'}))
  app.get('/callback', passport.authorize(name), resultHandler)
  return app
}
