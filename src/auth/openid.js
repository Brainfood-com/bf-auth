import { Strategy as OpenIDStrategy } from 'passport-openid'

function register(password, app) {
  passport.use(new OpenIDStrategy({
    realm: 'http://www.example.com/',
    returnURL: 'http://www.example.com/auth/openid/return',
    profile: true,
  }, (identifier, profile, done) => {
    User.findOrCreate({ openId: identifier }, function(err, user) {
      done(err, user);
    });
  }
  ));

  app.get('/v1/openid', (req, res) => {
    res.status(200)
    res.send(`
<form action="/v1/openid" method="post">
    <div>
        <label>OpenID:</label>
        <input type="text" name="openid_identifier"/><br/>
    </div>
    <div>
        <input type="submit" value="Sign In"/>
    </div>
</form>
`
    )
  })
  app.post('/v1/openid', passport.authenticate('openid'))
  app.get('/v1/openid/return', passport.authenticate('openid', {
    successRedirect: '/',
    failureRedirect: '/v1/login',
  }))
}
