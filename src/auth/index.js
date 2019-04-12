import express from 'express'

export default function Auth() {
  const app = express()

  app.locals.title = 'authentication'
  return app
}
