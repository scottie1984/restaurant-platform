'use strict'
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const mongo = require('./mongo')

const whitelist = ['http://localhost:8000']
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
const publicCors = cors()

const app = express()
app.use(bodyParser.json())

app.get('/ping', publicCors, (req, res) => {
  res.send({
    message: 'Welcome to the internet!'
  })
})

app.get('/restaurants', publicCors, async (req, res) => {
  const restaurants = await mongo.finderFromRestaurantsEmpty()
  res.send(restaurants)
})

app.post('/restaurants/create', adminCors, async (req, res) => {
  await mongo.insertToRestaurants(req.body)()
  res.send({
    message: 'Restaurant inserted successfully'
  })
})

module.exports = app
