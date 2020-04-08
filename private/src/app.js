'use strict'
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const mongo = require('./mongo')

const whitelist = ['http://localhost:8000', 'http://localhost:3000', 'https://master.d2gtcpj8lj87zj.amplifyapp.com/']
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}

const adminCors = cors(corsOptions)

const app = express()
app.use(bodyParser.json())

app.options('*', cors())

const getEmail = req => req.event.requestContext.authorizer.claims.email

app.get('/ping', adminCors, (req, res) => {
  res.send({
    message: 'Welcome to the internet!'
  })
})

app.get('/restaurants', adminCors, async (req, res) => {
  const signupEmail = getEmail(req)
  const restaurants = await mongo.finderFromRestaurantsEmpty()
  const response = {
    signupEmail,
    restaurants
  }
  res.send(response)
})

app.post('/restaurants/create', adminCors, async (req, res) => {
  const signupEmail = getEmail(req)
  const data = {
    signupEmail,
    ...req.body
  }
  await mongo.insertToRestaurants(data)()
  res.send({
    message: 'Restaurant inserted successfully'
  })
})

module.exports = app
