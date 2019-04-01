// == local
import express from 'express'
import { Strategy as LocalStrategy } from 'passport-local'

export function build(name, {passport, userDb}, resultHandler) {
  passport.use(name, new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
  }, (username, password, done) => {
    //console.log('local check', {username, password})
    return done(null, {name, username, password})
  }))

  const app = express()
  app.locals.provider = 'form'
  app.locals.title = 'Form'
  app.get('/', (req, res) => {
    res.status(200)
    res.send(`
<form action="" method="post">
    <div>
        <label>Username:</label>
        <input type="text" name="username"/><br/>
    </div>
    <div>
        <label>Password:</label>
        <input type="password" name="password"/><br/>
    </div>
    <div>
        <input type="submit" value="Sign In"/>
    </div>
</form>
`
	  )
  })
  app.post('/', passport.authorize(name, {}), resultHandler)
  return app
}
