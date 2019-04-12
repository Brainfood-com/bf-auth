import cors from 'cors'
import express from 'express'
import Http from 'http'
import session from 'express-session'
import SessionFileStore from 'session-file-store'
import User from './user'
import Auth from './auth'

const app = express()
app.use(cors({
  credentials: true,
  origin: true,
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

app.use('/user', User())
app.use('/auth', Auth())

const http = Http.Server(app)
http.listen(8080, () => {
  console.log('Listening on *:8080')
})

