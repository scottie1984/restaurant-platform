'use strict'
const express = require('express')
const bodyParser = require('body-parser')
const mongo = require('./mongo')

const app = express()
app.use(bodyParser.json())

app.get('/ping', (req, res) => {
  res.send({
    message: 'Welcome to the internet!'
  })
})

app.get('/restaurants', async (req, res) => {
  const restaurants = await mongo.finderFromRestaurantsEmpty()
  res.send(restaurants)
})

app.post('/restaurants/create', async (req, res) => {
  await mongo.insertToRestaurants(req.body)()
  res.send({
    message: 'Restaurant inserted successfully'
  })
})

module.exports = app
