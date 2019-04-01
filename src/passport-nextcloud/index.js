import { InternalOAuthError, Strategy as OAuth2Strategy } from 'passport-oauth2'
import url from 'url'

class NextcloudStrategy extends OAuth2Strategy {
  constructor({nextcloudBaseURL, ...options}, handler) {
    super({
      ...options,
      authorizationURL: url.resolve(nextcloudBaseURL, 'apps/oauth2/authorize'),
      tokenURL: url.resolve(nextcloudBaseURL, 'apps/oauth2/api/v1/token'),
    }, handler)
    this.name = 'nextcloud'
    this._nextcloudBaseURL = nextcloudBaseURL
  }

  userProfile(accessToken, done) {
    const userURL = url.parse(url.resolve(this._nextcloudBaseURL, 'ocs/v2.php/cloud/user'))
    userURL.search = 'format=json'
    //console.log('userProfileUrl', url.format(userURL))
    this._oauth2.useAuthorizationHeaderforGET(true)
    this._oauth2.get(url.format(userURL), accessToken, (err, body, res) => {
      //console.log('nextcloud:userProfile', err, body)
      if (err) {
        return done(new InternalOAuthError('Failed to fetch user profile', err))
      }
      const json = JSON.parse(body)
      const nextcloudProfile = json.ocs.data
      //console.log('nextcloudProfile', nextcloudProfile)
      const authUser = {
        id: nextcloudProfile.id,
        email: nextcloudProfile.email,
        displayName: nextcloudProfile['display-name'],
        provider: {
          nextCloud: nextcloudProfile,
        },
      }
      return done(null, nextcloudProfile)
    })
  }
}
export const Strategy = NextcloudStrategy
