//import DB from '../utils/DB'

import fetch from 'node-fetch'

import AbstractUserDB from './AbstractUserDB'

function buildMoquiFetch({moquiPrefix, moquiAuthUsername, moquiAuthPassword}) {
  let moquiSessionToken
  function getSessionToken() {
    if (!moquiSessionToken) {
      moquiSessionToken = fetch(`${moquiPrefix}/rest/s1/bf-auth/connect`).then(response => response.headers.get('moquiSessionToken'))
    }
    return moquiSessionToken
  }
  const basicAuth = moquiAuthUsername + ':' + moquiAuthPassword
  const authorization = 'Basic ' + Buffer.from(basicAuth).toString('base64')
  console.log('moqui auth', basicAuth, authorization)
  return async (apiPath, {headers = {}, ...options} = {}) => {
    const fetchOptions = {
      ...options,
      credentials: true,
      headers: {
        ...headers,
        authorization,
        moquiSessionToken: 'foobar', //await getSessionToken(),
      }
    }
    console.log('apiPath', apiPath)
    console.log('fetchOptions', fetchOptions)
    return fetch(`${moquiPrefix}/rest/s1${apiPath}`, fetchOptions)
  }
}

export default function MoquiDB(config) {
  // adminUser
  // adminPass
  // moquiPrefix
  //const {path, fileExtension} = config

  const moquiPrefix = process.env.MOQUI_PREFIX
  const moquiAuthUsername = process.env.MOQUI_AUTH_USERNAME
  const moquiAuthPassword = process.env.MOQUI_AUTH_PASSWORD
  //const database = new DB(path)

  const moquiFetch = buildMoquiFetch({moquiPrefix, moquiAuthUsername, moquiAuthPassword})

  const defaultUserToken = {partyId: 1234}
  class MoquiDB extends AbstractUserDB {
    async login(username, password) {
    }

    async me(userToken = {partyId: 1234}) {
      console.log('Moqui:me:userToken', userToken)
      const {partyId} = userToken
      const me = await moquiFetch(`/bf-auth/me/${partyId}`).then(response => response.json())
      console.log('Moqui:me', me)
      if (me.partyId) {
        // FIXME: the frontend expects to find .userId
        me.userId = me.partyId
        delete me.partyId
      }
      return me
    }

    // TODO: remove this api?
    async user(userToken) {
      const {userId} = userToken
      return database.getRow('users', userId)
    }

    async attachAccount(userToken, providers) {
      const {partyId} = userToken || {}
      console.log('providers', providers)
      const result = await moquiFetch(`/bf-auth/account/${partyId === undefined ? '' : partyId}`, {
        method: partyId === undefined ? 'POST' : 'PUT',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          partyId: partyId,
          providers: Object.entries(providers).map(([name, {profile, token}]) => ({name, profile, token})),
        }),
      }).then(response => response.json())
      console.log('result', result)
      return {partyId: result.partyId}
    }

    async getProviderProfile(userToken, providerName) {
      const {partyId} = userToken || {}
      const result = await moquiFetch(`/bf-auth/account/${partyId}/${providerName}`).then(response => response.json())
      return result.providerProfile
    }

    async getToken(userToken, name) {
      const {partyId} = userToken || {}
      const result = await moquiFetch(`/bf-auth/tokens/${partyId}/${name}`).then(response => response.json())
      return result.token
    }

    async verifyHash(hash) {
      console.log('attachHash:', {hash})
      const result = await moquiFetch(`/bf-auth/emailLogin/${hash}`).then(response => response.json())
      console.log('result', result)
      return {
        user: {partyId: result.partyId},
        profile: {
          id: result.emailAddress,
          emails: [
            {value: result.emailAddress},
          ],
        },
      }
    }

    async emailRequest(userToken, emailAddress) {
      console.log('emailRequest', {userToken, emailAddress})
      const {partyId} = userToken
      const result = await moquiFetch('/bf-auth/emailLogin', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          partyId,
          emailAddress,
        }),
      }).then(response => response.json())
      console.log('result', result)
    }
  }

  return new MoquiDB()
}
