import express from 'express'
import bodyParser from 'body-parser'
import cookie from 'cookie'
import cookieParser from 'cookie-parser'
import path from 'path'
import setCookieParser from 'set-cookie-parser'
import fetch from 'node-fetch'

import { Authenticator as Passport } from 'passport'

import {baseUrl} from '../utils'
import touchSession from '../touchSession'
import * as Local from './local'
import * as OAuth2 from './oauth2'
import * as Facebook from './facebook'
import * as Nextcloud from './nextcloud'

class UserAPIWrapper {
  constructor(userApiPrefix) {
    this._userApiPrefix = userApiPrefix
  }

  async findById(userId) {
    return fetch(this._userApiPrefix + '/user/' + userId).then(data => data.json())
  }

  async attachAccount(user, account) {
    //console.log('attachAccount')
    //console.log('-| user:', user)
    //console.log('-| account:', account)
    const providerResult = await fetch(this._userApiPrefix + '/provider/' + (user ? user.id : ''), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(account),
    }).then(data => data.json())
    return this.findById(providerResult.userId)
  }
}

export function authMiddleware() {
  const authServerPrefix = 'http://localhost:8080/auth'
  const authCookieName = process.env.AUTH_COOKIE_NAME
  const passport = new Passport()
  passport.serializeUser((user, done) => {
    console.log('serialzeUser', user)
    done(null, user.userId)
  })
  passport.deserializeUser((id, done) => {
    //console.log('deserialzeUser', id)
    return done(null, {userId: id})
  })
  const app = express()
  app.use(cookieParser())
  //app.use(bodyParser.urlencoded({ extended: false }))
  app.use(passport.initialize())
  app.use(passport.session())

  app.use((req, res, next) => {
    console.log('middleware:user(check)', req.user)
    if (false && req.user) {
      next()
      return
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
          //res.cookie(authCookieName, authCookie.value)
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
            next()
            break
        }
      }).catch(err => {
        console.error(err)
        res.status(500).send(err)
      })
    } else {
      next()
    }
    //res.status(401).send('')
  })
  return app
}

export default function Auth() {
  const userDb = new UserAPIWrapper(process.env.AUTH_USER_PREFIX)
  const passport = new Passport()
  passport.serializeUser((user, done) => {
    //console.log('serialzeUser', user)
    done(null, user.id)
  })
  passport.deserializeUser((id, done) => {
    //console.log('deserialzeUser', id)
    userDb.findById(id).then(user => {
      //console.log('got user', user)
      return done(null, user)
    }).catch(done)
  })
  const app = express()

  app.locals.title = 'authentication'
  app.use('/assets', express.static(path.join(__dirname, 'assets')))
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(passport.initialize())
  app.use(passport.session())
  app.use(touchSession())

  const successRedirect = ''
  const failureRedirect = 'login'

  async function resultHandler(req, res) {
    const {account, user, session} = req
    const {name, accessToken, refreshToken} = account
    console.log('provider result', {account})
    const userAccess = session.userTokens || (session.userTokens = {})
    const providerAccess = userAccess[name] || (userAccess[name] = {})
    providerAccess.accessToken = accessToken
    providerAccess.refreshToken = refreshToken
    req.logIn(await userDb.attachAccount(user, account), err => {
      if (err) {
        res.send(err)
      } else {
        res.redirect(`${req.baseUrl}/../redirect_to`)
      }
    })
  }

  const providers = {
    //oauth2: OAuth2.build('oauth2', {passport, userDb}, resultHandler),
    //local: Local.build('local', {passport, userDb}),
    nextcloud: Nextcloud.build('nextcloud', {passport, userDb}),
    facebook: Facebook.build('facebook', {passport, userDb}),
  }
  Object.entries(providers).forEach(([name, subApp]) => {
    app.use('/' + name, subApp, resultHandler)
  })
  app.get('/redirect_json', (req, res) => {
    res.send(`
<html>
  <head>
    <script type="text/javascript">
      window.opener.postMessage("authProviderDone", "*");
    </script>
  </head>
  <body>
    <h1>Closing iframe</h1>
  </body>
</html>
`)
  })
  app.get('/redirect_to', (req, res) => {
    const {
      session: {
        'auth:redirectTo': redirectTo,
        'auth:redirectJson': redirectJson,
      },
    } = req
    //console.log('login:resultHandler:redirectTo', redirectTo)
    if (redirectTo) {
      delete req.session['auth:redirectTo']
      res.redirect(redirectTo)
    } else if (redirectJson) {
      delete req.session['auth:redirectJson']
      res.redirect(`${req.baseUrl}/redirect_json`)
    } else {
      res.send('auth resultHandler\n')
    }
  })
  app.get('/', (req, res) => {
    console.log('auth root')
    const pageLines = []
    pageLines.push('<ul>\n')
    const debugLines = []
    debugLines.push('<pre>\n')
    debugLines.push('auth root\n')
    if (req.user) {
      debugLines.push('is logged in:' + JSON.stringify(req.user, null, ' '))
      Object.entries(req.user.providers).forEach(([name, profile]) => {
        pageLines.push(`<li>${name}<ul>\n`)
        if (profile.email) {
          pageLines.push(`<li>Email: ${profile.email}</li>\n`)
        }
        if (profile.photos) {
          pageLines.push(`<li><img src="${profile.photos[0].value}" /></li>\n`)
        }
        pageLines.push(`</ul></li>\n`)
      })
    }
    pageLines.push('</ul>\n')
    debugLines.push('</pre>\n')
    res.send(pageLines.join('') + debugLines.join(''))
  })
  app.get('/login', (req, res) => {
    //console.log('login:redirectTo', redirectTo)
    const accepts = req.accepts(['text/html', 'application/json'])
    if (accepts === 'application/json') {
      req.session['auth:redirectJson'] = true
      res.send(Object.entries(providers).map(([name, subApp]) => {
        return {
          name: name,
          href: `${req.baseUrl}/${name}`,
          title: subApp.locals.title,
          logo: `${baseUrl(req)}/assets/${subApp.locals.logo}`,
        }
      }))
    } else {
      const {query: {redirect_to: redirectTo}} = req
      req.session['auth:redirectTo'] = redirectTo
      const page = '<ul>' + Object.entries(providers).map(([name, subApp]) => {
        return `<li><a href="${req.baseUrl}/${name}">${name}: ${subApp.locals.title}</a></li>`
      }).join('') + '</ul>'
      res.send(page)
    }
  })
  app.get('/logout', (req, res) => {
    if (req.session) {
      console.log('logout', req.session)
      const {session: {cookie}} = req
      res.clearCookie(process.env.AUTH_COOKIE_NAME, {
        path: cookie.path,
        domain: cookie.domain,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
      })
      req.session.destroy(err => {
        if (req.accepts('application/json')) {
          res.send({})
        } else {
          res.send('')
        }
        res.status(200)
      })
    } else {
      res.send('').status(200)
    }
  })
  app.get('/user/roles', (req, res) => {
    const {session: {user, userAccess}} = req
    const roles = []
    if (user && userAccess) {

    }
    
  })
  app.get('/user/me', (req, res) => {
    const {user} = req
    console.log('user/me', user)
    if (user) {
      const me = {emails: {}}
      Object.entries(user.providers).map(([providerName, providerProfile]) => {
        const {displayName, emails, photos} = providerProfile
        if (emails) {
          emails.forEach(email => me.emails[email] = true)
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
      res.status(404).send('')
    }
  })
  app.get('/pac/:role?', (req, res) => {
    const {query: {role}, user} = req
    //console.log('PAC', role, user)
    //console.log('headers', req.headers)
    if (user) {
      if (role) {
        res.status(500)
      } else {
        res.status(200)
        res.send({
          userId: user.id,
          roles: [],
        })
      }
    } else {
      res.redirect(401, `${baseUrl(req)}/login`)
    }
  })
  return app
}
