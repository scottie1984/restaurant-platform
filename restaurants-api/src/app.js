'use strict'
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const aws = require('aws-sdk')
const ses = new aws.SES()
const mongo = require('./mongo')
const _ = require('lodash')
const STRIPE_KEY = process.env.STRIPE_KEY
const stripe = require('stripe')(STRIPE_KEY)
const upload = require('./upload')

const whitelist = ['http://localhost:8000', 'http://localhost:3000', 'https://master.d2gtcpj8lj87zj.amplifyapp.com/']
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
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
  const restaurants = await mongo.finderFromRestaurants({ signupEmail })()
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

async function processFIles (inputFiles) {
  const files = {}
  if (inputFiles) {
    const keys = Object.keys(inputFiles)
    for (const key of keys) {
      const data = await upload.uploadToS3(inputFiles[key])
      files[key] = data.id
    }
  }
  return files
}

const multipart = require('connect-multiparty')
const multipartMiddleware = multipart()

app.post('/restaurants/create', adminCors, multipartMiddleware, async (req, res) => {
  const signupEmail = getEmail(req)
  const files = await processFIles(req.files)
  const data = {
    signupEmail,
    ...req.body,
    ...files
  }
  const { ops } = await mongo.insertToRestaurants(data)()
  await sendWelcomeEmail(signupEmail)
  res.send({
    message: 'Restaurant inserted successfully',
    doc: ops[0]
  })
})

app.post('/restaurants/patch/:id', adminCors, async (req, res) => {
  const signupEmail = getEmail(req)
  const id = req.params.id
  const data = req.body
  await mongo.updateByIdToRestaurants({ $set: data })(id, signupEmail)
  res.send({
    message: 'Restaurant patched successfully'
  })
})

app.post('/restaurants/update/:id', adminCors, async (req, res) => {
  const signupEmail = getEmail(req)
  const id = req.params.id
  const data = {
    signupEmail,
    ...req.body
  }
  await mongo.updateByIdToRestaurants(data)(id, signupEmail)
  res.send({
    message: 'Restaurant patched successfully'
  })
})

app.post('/connect/:id', adminCors, async (req, res) => {
  const signupEmail = getEmail(req)
  const id = req.params.id
  const response = await stripe.oauth.token({
    grant_type: 'authorization_code',
    code: req.body.code
  })

  const connectedAccountId = response.stripe_user_id
  await mongo.updateByIdToRestaurants({ $set: { stripeId: connectedAccountId } })(id, signupEmail)
  res.send({
    message: 'Restaurant connected successfully'
  })
})

app.post('/charge', adminCors, async (req, res) => {
  const signupEmail = getEmail(req)
  const { amount, source, restaurantId } = req.body

  console.log('req.body', req.body)
  const restaurantDetails = await mongo.fineOneByIdRestaurants()(restaurantId)
  console.log('rrestaurantDetails', restaurantDetails)

  const charge = await stripe.charges.create({
    amount,
    currency: 'gbp',
    source,
    receipt_email: signupEmail
  }, { stripeAccount: restaurantDetails.stripeId })

  res.status(200).json({
    message: 'charge posted successfully',
    charge
  })
})

module.exports = app
