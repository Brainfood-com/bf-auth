import express from 'express'
import cookie from 'cookie'
import cookieParser from 'cookie-parser'
import setCookieParser from 'set-cookie-parser'
import fetch from 'node-fetch'

import { Authenticator as Passport } from 'passport'

export default function authMiddleware() {
  const authServerPrefix = process.env.AUTH_SERVER_PREFIX
  //'http://localhost:8080/auth'
  const authCookieName = process.env.AUTH_COOKIE_NAME
  const passport = new Passport()
  passport.serializeUser((user, done) => {
    //console.log('serialzeUser', user)
    done(null, user.userId)
  })
  passport.deserializeUser((id, done) => {
    //console.log('deserialzeUser', id)
    return done(null, {userId: id})
  })
  const app = express()
  app.use(cookieParser())
  app.use(passport.initialize())
  app.use(passport.session())

  app.use((req, res, next) => {
    console.log('middleware:user', req.user)
    if (req.user) {
      next()
    }
    const {cookies: {[authCookieName]: authCookie}} = req
    //console.log('middleware:authCookie', authCookie)
    if (authCookie) {
      fetch(`${authServerPrefix}/pac/`, {
        headers: {
          cookie: cookie.serialize(authCookieName, authCookie),
        },
      }).then(response => {
        //console.log('middleware:response:headers', response.headers)
        const {[authCookieName]: authCookie} = setCookieParser(response.headers.get('set-cookie'), {map: true})
        //console.log('middleware:response:', response.status, authCookie)
        if (authCookie) {
          res.cookie(authCookieName, authCookie.value)
        }
        switch (response.status) {
          case 200:
            response.json().then(user => {
              console.log('middleware:user:', user)
              const {userId} = user
              req.logIn(user, err => {
                if (err) {
                  res.status(500).send(err)
                } else {
                  next()
                }
              })
            })
            break
          case 401:
            // TODO: login redirect via api?
            break
        }
      }).catch(err => {
        res.status(500).send(err)
      })
    }
    //res.status(401).send('')
  })
  return app
}
