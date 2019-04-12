import url from 'url'

export default function fixOAuth2CallbackURL(Class) {
  return class OAuth2CallbackURLFix extends Class {
    constructor(options, handler) {
      super(options, handler)
      const origAuthenticate = this.authenticate
      this.authenticate = function(req, callOptions = {}, callback) {
        let callbackURL = callOptions.callbackURL || options.callbackURL
        console.log('callbackURL', callbackURL)
        const parsed = url.parse(callbackURL)
        if (!parsed.protocol) {
          callbackURL = url.resolve(req.authSubAppOriginalUrl + '/', callbackURL)
          console.log('resolved', req.originalUrl, req.authSubAppOriginalUrl, req.baseUrl, callbackURL)
        }
        return origAuthenticate.call(this, req, {...callOptions, callbackURL}, callback)
      }
    }
  }
}
