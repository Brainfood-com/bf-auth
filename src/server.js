import express from 'express'
import Http from 'http'

const app = express()

const http = Http.Server(app)
http.listen(8080, () => {
  console.log('Listening on *:8080')
})

