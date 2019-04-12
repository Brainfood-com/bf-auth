import express from 'express'

export default function User() {
  const app = express()

  app.locals.title = 'users'
  return app
}
