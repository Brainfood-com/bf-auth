import { Strategy as GoogleStrategy } from 'passport-google-oauth'

function register(password, app) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: 'callback',
  }, (accessToken, refreshToken, profile, done) => {
    User.findOrCreate({ googleId: profile.id }, (err, user) => {
      return done(err, user)
    })
  }))
  //app.get('/auth/google', passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login'] }))

  app.get('/v1/google', passport.authenticate('google'))
  app.get('/v1/google/callback', passport.authenticate('google', { failureRedirect: '/v1/login' }), (req, res) => {
    res.redirect('/')
  })
}
