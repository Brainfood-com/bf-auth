const defaultConfig = {
  lastTouchedKey: 'lastTouched',
  isSessionActivePath: '/isSessionActive',
  isSessionActiveMethod: 'GET',
}

export default function touchSession(config) {
  config = {...defaultConfig, ...config}
  return (req, res, next) => {
    const now = Date.now()
    const {session} = req
    if (req.user && !session[config.lastTouchedKey]) {
      session[config.lastTouchedKey] = now
    }
    if (req.method === config.isSessionActiveMethod && req.path === config.isSessionActivePath) {
      if (req.query.touch === 'true') {
        session.cookie.maxAge = session.cookie.originalMaxAge
        session[config.lastTouchedKey] = now
      }
      const lastTouched = session[config.lastTouchedKey]
      const isSessionActive = lastTouched && (session.cookie.originalMaxAge - now + lastTouched)
      res.status(200).send({isSessionActive})
      return
    }
    next()
  }
}
