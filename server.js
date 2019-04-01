import express from 'express'
import bodyParser from 'body-parser'
import session from 'express-session'
import Http from 'http'

import { Authenticator as Passport } from 'passport'

let app = express()
let http = Http.Server(app)

let options = {}
let sessions = {}

const passport = new Passport()

app.use(session({secret: 'foobar'}))
app.use(passport.initialize())
app.use(passport.session())

const providers = {
  local: {},
}

import * as Local from './src/local'
//import * as OpenID from './src/openid'
//import * as Facebook from './src/facebook'
//import * as Google from './src/google'

Local.register(passport, app)

app.get('/v1/providers', (req, res) => {

})


//app.post('/login', passport.authenticate('local', {successRedirect: '/', failureRedirect: '/login'}))

/*
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})
*/


http.listen(8080, () => {
  console.log('Listening on *:8080')
})

