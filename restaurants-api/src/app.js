'use strict'
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const aws = require('aws-sdk')
const ses = new aws.SES()
const mongo = require('./mongo')
const _ = require('lodash')

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

const getEmail = req => _.get(req, 'event.requestContext.authorizer.claims.email', 'default@email.com')

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

function generateEmailParams (email) {
  return {
    Source: 'scottie1984@gmail.com',
    Destination: { ToAddresses: [email] },
    ReplyToAddresses: ['scottie1984@gmail.com'],
    Message: {
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data: 'Thanks for registering with LocoLoco - we will get back to you as soon as possible'
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Thanks for registering with LocoLoco!'
      }
    }
  }
}

function sendWelcomeEmail (email) {
  const emailParams = generateEmailParams(email)
  return ses.sendEmail(emailParams).promise()
}

app.post('/restaurants/create', adminCors, async (req, res) => {
  const signupEmail = getEmail(req)
  const data = {
    signupEmail,
    ...req.body
  }
  await mongo.insertToRestaurants(data)()
  await sendWelcomeEmail(signupEmail)
  res.send({
    message: 'Restaurant inserted successfully'
  })
})

module.exports = app
