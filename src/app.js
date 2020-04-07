'use strict'
const express = require('express')
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser.json())

app.get('/ping', (req, res) => {
  res.send({
    message: 'Welcome to the internet!'
  })
})

module.exports = app
