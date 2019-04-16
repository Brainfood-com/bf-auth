export default class AbstractUserDB {
  // returns opaque user token on login success
  // null/undefined on error
  async login(username, password) {
    throw new Error('Unsupported')
  }

  // returns profile data
  async me(userToken) {
    throw new Error('Unsupported')
  }

  // attaches a new account to the current user, or auto-creates a new one
  // returns opaque user token on success
  // null/undefined on error
  async attachAccount(userToken, profiles) {
    throw new Error('Unsupported')
  }
}
