import fetch from 'node-fetch'
import cors from 'cors'
import express from 'express'
import Http from 'http'
import bodyParser from 'body-parser'
import session from 'express-session'
import SessionFileStore from 'session-file-store'

import User from './user'
import Auth from './auth'

const app = express()
app.use(cors({
  credentials: true,
  origin: true,//https://${process.env.VHOST_BASE}`,
}))
app.use(session({
  cookie: {
    domain: process.env.AUTH_COOKIE_DOMAIN,
  },
  name: process.env.AUTH_COOKIE_NAME,
  proxy: true,
  resave: false,
  saveUninitialized: false,
  secret: process.env.AUTH_SECRET,
  store: new (SessionFileStore(session))({
    ttl: parseInt(process.env.AUTH_SESSION_TTL),
    path: process.env.AUTH_SESSION_PATH,
  })
}))

app.get('/foo', (req, res) => {
  res.send('foo')
})
// --

app.use('/user', User({
  path: process.env.USER_STORE_PATH,
  fileExtension: process.env.USER_STORE_EXTENSION,
}))

// /user/users?id=${id}
// /user/users/

app.use('/auth', Auth())

// --

const http = Http.Server(app)
http.listen(8080, () => {
  console.log('Listening on *:8080')
})

