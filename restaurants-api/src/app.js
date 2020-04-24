'use strict'
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const mongo = require('./mongo')
const _ = require('lodash')
const upload = require('./upload')
const stripe = require('./stripe')

const whitelist = ['http://localhost:8000', 'http://localhost:3000', 'https://master.d2gtcpj8lj87zj.amplifyapp.com/', 'https://www.loql.io']
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

const hasAccessToRestaurant = async (req, res, next) => {
  const signupEmail = getEmail(req)
  const restaurants = await mongo.finderFromRestaurants({ signupEmail })()
  const hasAccess = restaurants.find(r => r._id.toString() === req.params.id)

  if (hasAccess) {
    next()
  } else {
    res.send({
      message: 'User does not have access to restaurant'
    })
  }
}

const hasAccesToOrder = async (req, res, next) => {
  const signupEmail = getEmail(req)
  const restaurants = await mongo.finderFromRestaurants({ signupEmail })()
  const order = await mongo.fineOneByIdOrders()(req.params.id)
  const hasAccess = restaurants.find(r => r._id.toString() === order.restaurantId)

  if (hasAccess) {
    next()
  } else {
    res.send({
      message: 'User does not have access to restaurant'
    })
  }
}

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

async function processFiles (inputFiles) {
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

app.post('/restaurants/files/:id', adminCors, multipartMiddleware, hasAccessToRestaurant, async (req, res) => {
  const id = req.params.id
  const files = await processFiles(req.files)
  await mongo.updateByIdToRestaurants({ $set: files })(id)
  res.send({
    message: 'Restaurant files added successfully'
  })
})

app.post('/restaurants/create', adminCors, async (req, res) => {
  const signupEmail = getEmail(req)
  const data = {
    signupEmail,
    ...req.body
  }
  const { ops } = await mongo.insertToRestaurants(data)()
  res.send({
    message: 'Restaurant inserted successfully',
    doc: ops[0]
  })
})

app.post('/restaurants/patch/:id', adminCors, hasAccessToRestaurant, async (req, res) => {
  const id = req.params.id
  const data = req.body
  await mongo.updateByIdToRestaurants({ $set: data })(id)
  res.send({
    message: 'Restaurant patched successfully'
  })
})

app.post('/restaurants/update/:id', adminCors, hasAccessToRestaurant, async (req, res) => {
  const signupEmail = getEmail(req)
  const id = req.params.id
  const data = {
    signupEmail,
    ...req.body
  }
  await mongo.updateByIdToRestaurants(data)(id)
  res.send({
    message: 'Restaurant patched successfully'
  })
})

app.post('/connect/:id', adminCors, hasAccessToRestaurant, async (req, res) => {
  const id = req.params.id
  const response = await stripe.connect(req.body.code)

  const connectedAccountId = response.stripe_user_id
  await mongo.updateByIdToRestaurants({ $set: { stripeId: connectedAccountId } })(id)
  res.send({
    message: 'Restaurant connected successfully'
  })
})

app.post('/charge', adminCors, async (req, res) => {
  const signupEmail = getEmail(req)
  const { amount, source, restaurantId } = req.body

  const { stripeId } = await mongo.fineOneByIdRestaurants()(restaurantId)

  const charge = await stripe.charge({ amount, source, signupEmail, stripeId })

  const orderDetails = _.omit(req.body, ['source'])

  const order = {
    ...orderDetails,
    restaurantId,
    stripeChargeId: charge.id,
    stripeReceiptUrl: charge.receipt_url,
    signupEmail,
    status: 'OPEN'
  }

  await mongo.insertToOrders(order)()

  res.status(200).json({
    message: 'charge posted successfully',
    order
  })
})

app.get('/orders', adminCors, async (req, res) => {
  const signupEmail = getEmail(req)
  const status = req.query.status
  const query = status ? { signupEmail, status } : { signupEmail }
  const orders = await mongo.finderFromOrders(query)()
  const response = {
    signupEmail,
    orders
  }
  res.send(response)
})

app.get('/orders/:id', adminCors, hasAccessToRestaurant, async (req, res) => {
  const signupEmail = getEmail(req)
  const status = req.query.status
  const restaurantId = req.params.id
  const query = status ? { restaurantId, status } : { restaurantId }
  const orders = await mongo.finderFromOrders(query)()
  const response = {
    signupEmail,
    orders
  }
  res.send(response)
})

app.post('/orders/patch/:id', adminCors, hasAccesToOrder, async (req, res) => {
  const id = req.params.id
  const data = req.body
  await mongo.updateByIdToOrders({ $set: data })(id)
  res.send({
    message: 'Order patched successfully'
  })
})

module.exports = app
