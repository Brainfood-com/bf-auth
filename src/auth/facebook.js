import express from 'express'
import fetch from 'node-fetch'
import { Strategy as FacebookStrategy } from 'passport-facebook'

import fixOAuth2CallbackURL from './fixOAuth2CallbackURL'

const fbVersion = 'v3.2'
const graphBase = 'https://graph.facebook.com/' + fbVersion

export function build(name, {passport, userDb}) {
  const nameUpper = name.toUpperCase()
  passport.use(name, new (fixOAuth2CallbackURL(FacebookStrategy))({
    clientID: process.env[`${nameUpper}_APP_ID`],
    clientSecret: process.env[`${nameUpper}_APP_SECRET`],
    callbackURL: 'callback',
    proxy: true,
    scope: ['public_profile', 'email', 'user_gender'],
    profileFields: ['id', 'displayName', 'name', 'gender', 'birthday', 'profileUrl', 'emails', 'photos'],
  }, (accessToken, refreshToken, params, profile, done) => {
    return done(null, {profile, tokens: {accessToken, refreshToken}})
  }))

  const app = express()
  app.locals.provider = 'facebook'
  app.locals.title = 'Facebook'
  app.locals.logo = 'flogo_rgb_hex-brc-site-250.png'
  app.locals.popup = {width: 500, height: 270}
  app.get('/', passport.authorize(name, {authType: 'rerequest'}))
  app.get('/callback', passport.authorize(name))
  app.locals.api = {
    async getPermissions(profile, tokens) {
      const {accessToken, refreshToken} = tokens
      const {id} = profile
      console.log('facebook permissions', id, accessToken)
      if (accessToken && id) {
        const permissions = await fetch(`${graphBase}/${id}/permissions?access_token=${accessToken}`).then(data => data.json())
        //console.log('facebook permissions', permissions)
        const result = {}
        permissions.data.forEach(permission => {
          result[permission.permission] = permission.status === 'granted'
        })
        return result
      } else {
        return null
      }
    },
  }
  return app
}
