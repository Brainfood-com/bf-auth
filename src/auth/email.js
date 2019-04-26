import express from 'express'
import bodyParser from 'body-parser'
import fetch from 'node-fetch'
import { Strategy as HashStrategy } from 'passport-hash'

export function build(name, {passport, userDb}) {
  passport.use(name, new HashStrategy((hash, done) => {
    console.log('passport-hash: ' + hash)
    return done(null, {hash})
  }))

  const app = express()
  app.locals.provider = 'email'
  app.locals.title = 'Email'
  app.locals.popup = {width: 500, height: 270}
  app.get('/', (req, res) => {
    res.send(`
<form action="" method="post">
    <div>
        <label>Email:</label>
        <input type="text" name="email"/><br/>
    </div>
    <div>
        <input type="submit" value="Request access"/>
    </div>
</form>
`
    )

  })
  app.post('/', async (req, res) => {
    const {body: {email}} = req
    await userDb.emailRequest(req.user, email)
    res.redirect(`${req.baseUrl}/verify`)
  })
  app.get('/verify', (req, res) => {
    res.send(`
<form action="${req.baseUrl}/confirm" method="get">
    <div>
        <label>Hash:</label>
        <input type="text" name="hash"/><br/>
    </div>
    <div>
        <input type="submit" value="Confirm access"/>
    </div>
</form>
`
    )

  })
  app.get('/confirm', passport.authorize(name))
  app.locals.api = {
    async getPermissions(profile, tokens) {
      return null
    },
  }
  return app
}

/*
  app.get('/', (req, res) => {
    res.status(200)
`
	  )
  })
*/
