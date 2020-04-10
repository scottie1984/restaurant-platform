'use strict'
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const mongo = require('./mongo')

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

module.exports = app
