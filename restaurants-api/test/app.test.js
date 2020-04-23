'use strict'

const assert = require('assert')
const mongo = require('../src/mongo')
const stripe = require('../src/stripe')
const aws = require('aws-sdk')
const sinon = require('sinon')

const sandbox = sinon.createSandbox()
sandbox.stub(aws, 'SES').returns({
  sendEmail: () => ({
    promise: () => Promise.resolve()
  })
})

sandbox.stub(stripe, 'charge').returns(Promise.resolve({ id: 'stripe-payment-id', receipt_url: 'receipt-url' }))

const makeRequest = require('./make-request')

describe('Restuarants API', () => {
  after(async () => {
    await mongo.close()
  })

  describe('Ping', () => {
    it('should return message', async () => {
      const res = await makeRequest.get('/ping')

      assert.strictEqual(res.status, 200)
      assert.deepStrictEqual(res.body, { message: 'Welcome to the internet!' })
    })
  })

  describe('Create restaurant', () => {
    before(async () => {
      await mongo.deleteAllRestaurants()
      await mongo.deleteAllCounters()
    })

    it('should insert a restaurant', async () => {
      const res = await makeRequest.post('/restaurants/create', { name: 'simply-the-best' })

      assert.strictEqual(res.status, 200)
      assert.deepStrictEqual(res.body.message, 'Restaurant inserted successfully')
      const restaurants = await mongo.finderFromRestaurantsEmpty()

      assert.strictEqual(restaurants.length, 1)
      assert.strictEqual(restaurants[0].name, 'simply-the-best')
      assert.strictEqual(restaurants[0].signupEmail, 'default@email.com')
      // assert.ok(aws.SES.called)
    })
  })

  describe('Get restaurants for user', () => {
    before(async () => {
      await mongo.deleteAllRestaurants()
      await mongo.deleteAllCounters()
    })

    it('should return a list of restaurants', async () => {
      await mongo.insertToRestaurants({ name: 'best-ever', signupEmail: 'default@email.com' })()
      await mongo.insertToRestaurants({ name: 'best-best-ever', signupEmail: 'default@email.com' })()
      await mongo.insertToRestaurants({ name: 'simply-the-best', signupEmail: 'another@email.com' })()
      const res = await makeRequest.get('/restaurants')

      assert.strictEqual(res.status, 200)
      assert.deepStrictEqual(res.body.restaurants.length, 2)
      assert.deepStrictEqual(res.body.restaurants[0].name, 'best-ever')
      assert.deepStrictEqual(res.body.restaurants[1].name, 'best-best-ever')
    })
  })

  describe('Patch restaurant', () => {
    before(async () => {
      await mongo.deleteAllRestaurants()
      await mongo.deleteAllCounters()
    })

    it('should patch a restaurant', async () => {
      const { body } = await makeRequest.post('/restaurants/create', { name: 'simply-the-best' })
      const res = await makeRequest.post('/restaurants/patch/' + body.doc._id, { status: 'approved' })
      assert.strictEqual(res.status, 200)

      const restaurants = await mongo.finderFromRestaurantsEmpty()

      assert.strictEqual(restaurants.length, 1)
      assert.strictEqual(restaurants[0].name, 'simply-the-best')
      assert.strictEqual(restaurants[0].signupEmail, 'default@email.com')
      assert.strictEqual(restaurants[0].status, 'approved')
      // assert.ok(aws.SES.called)
    })
  })

  describe('Update restaurant', () => {
    before(async () => {
      await mongo.deleteAllRestaurants()
      await mongo.deleteAllCounters()
    })

    it('should overwrite a restaurant', async () => {
      const { body } = await makeRequest.post('/restaurants/create', { name: 'simply-the-best' })
      const res = await makeRequest.post('/restaurants/update/' + body.doc._id, { status: 'approved' })
      assert.strictEqual(res.status, 200)

      const restaurants = await mongo.finderFromRestaurantsEmpty()

      assert.strictEqual(restaurants.length, 1)
      assert.strictEqual(restaurants[0].name, undefined)
      assert.strictEqual(restaurants[0].signupEmail, 'default@email.com')
      assert.strictEqual(restaurants[0].status, 'approved')
      // assert.ok(aws.SES.called)
    })
  })

  describe('Create an order', () => {
    before(async () => {
      await mongo.deleteAllRestaurants()
      await mongo.deleteAllOrders()
      await mongo.deleteAllCounters()
    })

    it('should create an order', async () => {
      const { body } = await makeRequest.post('/restaurants/create', { name: 'simply-the-best', stripeId: '123' })
      const res = await makeRequest.post('/charge', { restaurantId: body.doc._id, source: 'stripe-source', amount: 1, basket: ['a', 'b', 'c'] })
      assert.strictEqual(res.status, 200)
      const order = res.body.order
      assert.ok(order._id)

      assert.strictEqual(order.restaurantId, body.doc._id)
      assert.strictEqual(order.amount, 1)
      assert.deepStrictEqual(order.basket, ['a', 'b', 'c'])
      assert.strictEqual(order.stripeChargeId, 'stripe-payment-id')
      assert.strictEqual(order.signupEmail, 'default@email.com')
      assert.strictEqual(order.stripeReceiptUrl, 'receipt-url')
      assert.strictEqual(order.status, 'OPEN')

      assert.ok(stripe.charge.called)
    })
  })

  describe('Retrieve orders for customer', () => {
    beforeEach(async () => {
      await mongo.deleteAllRestaurants()
      await mongo.deleteAllOrders()
      await mongo.deleteAllCounters()
    })

    it('should retrieve open orders', async () => {
      await mongo.insertToOrders({ restaurantId: '123', amount: 1, basket: ['a', 'b', 'c'], signupEmail: 'default@email.com', status: 'OPEN' })()
      await mongo.insertToOrders({ restaurantId: '123', amount: 2, basket: ['a'], signupEmail: 'default@email.com', status: 'CLOSED' })()
      const res = await makeRequest.get('/orders?status=OPEN')
      const orders = res.body.orders

      assert.strictEqual(orders.length, 1)
      assert.strictEqual(orders[0].status, 'OPEN')
    })

    it('should retrieve closed orders', async () => {
      await mongo.insertToOrders({ restaurantId: '123', amount: 1, basket: ['a', 'b', 'c'], signupEmail: 'default@email.com', status: 'OPEN' })()
      await mongo.insertToOrders({ restaurantId: '123', amount: 2, basket: ['a'], signupEmail: 'default@email.com', status: 'CLOSED' })()
      const res = await makeRequest.get('/orders?status=CLOSED')
      const orders = res.body.orders

      assert.strictEqual(orders.length, 1)
      assert.strictEqual(orders[0].status, 'CLOSED')
    })

    it('should not retrieve someone elses orders', async () => {
      await mongo.insertToOrders({ restaurantId: '123', amount: 1, basket: ['a', 'b', 'c'], signupEmail: 'default@email.com', status: 'OPEN' })()
      await mongo.insertToOrders({ restaurantId: '123', amount: 2, basket: ['a'], signupEmail: 'another@email.com', status: 'OPEN' })()
      const res = await makeRequest.get('/orders?status=OPEN')
      const orders = res.body.orders

      assert.strictEqual(orders.length, 1)
      assert.strictEqual(orders[0].signupEmail, 'default@email.com')
    })

    it('should retrieve multiple orders', async () => {
      await mongo.insertToOrders({ restaurantId: '123', amount: 1, basket: ['a', 'b', 'c'], signupEmail: 'default@email.com', status: 'OPEN' })()
      await mongo.insertToOrders({ restaurantId: '123', amount: 2, basket: ['a'], signupEmail: 'default@email.com', status: 'OPEN' })()
      const res = await makeRequest.get('/orders?status=OPEN')
      const orders = res.body.orders

      assert.strictEqual(orders.length, 2)
    })

    it('should retrieve all orders', async () => {
      await mongo.insertToOrders({ restaurantId: '123', amount: 1, basket: ['a', 'b', 'c'], signupEmail: 'default@email.com', status: 'OPEN' })()
      await mongo.insertToOrders({ restaurantId: '123', amount: 2, basket: ['a'], signupEmail: 'default@email.com', status: 'OPEN' })()
      const res = await makeRequest.get('/orders')
      const orders = res.body.orders

      assert.strictEqual(orders.length, 2)
    })
  })

  describe('Retrieve orders for restaurant', () => {
    beforeEach(async () => {
      await mongo.deleteAllRestaurants()
      await mongo.deleteAllOrders()
      await mongo.deleteAllCounters()
    })

    it('should retrieve open orders', async () => {
      const doc = await mongo.insertToRestaurants({ name: 'best-ever', signupEmail: 'default@email.com' })()
      const restaurantId = doc.insertedIds[0].toString()
      await mongo.insertToOrders({ restaurantId, amount: 1, basket: ['a', 'b', 'c'], signupEmail: 'default@email.com', status: 'OPEN' })()
      await mongo.insertToOrders({ restaurantId, amount: 2, basket: ['a'], signupEmail: 'default@email.com', status: 'CLOSED' })()
      const res = await makeRequest.get(`/orders/${restaurantId}?status=OPEN`)
      const orders = res.body.orders

      assert.strictEqual(orders.length, 1)
      assert.strictEqual(orders[0].status, 'OPEN')
    })

    it('should retrieve closed orders', async () => {
      const doc = await mongo.insertToRestaurants({ name: 'best-ever', signupEmail: 'default@email.com' })()
      const restaurantId = doc.insertedIds[0].toString()
      await mongo.insertToOrders({ restaurantId, amount: 1, basket: ['a', 'b', 'c'], signupEmail: 'default@email.com', status: 'OPEN' })()
      await mongo.insertToOrders({ restaurantId, amount: 2, basket: ['a'], signupEmail: 'default@email.com', status: 'CLOSED' })()
      const res = await makeRequest.get(`/orders/${restaurantId}?status=CLOSED`)
      const orders = res.body.orders

      assert.strictEqual(orders.length, 1)
      assert.strictEqual(orders[0].status, 'CLOSED')
    })

    it('should not retrieve someone elses orders', async () => {
      const doc = await mongo.insertToRestaurants({ name: 'best-ever', signupEmail: 'default@email.com' })()
      const restaurantId = doc.insertedIds[0].toString()
      await mongo.insertToOrders({ restaurantId, amount: 1, basket: ['a', 'b', 'c'], signupEmail: 'default@email.com', status: 'OPEN' })()
      await mongo.insertToOrders({ restaurantId: '456', amount: 2, basket: ['a'], signupEmail: 'another@email.com', status: 'OPEN' })()
      const res = await makeRequest.get(`/orders/${restaurantId}?status=OPEN`)
      const orders = res.body.orders

      assert.strictEqual(orders.length, 1)
      assert.strictEqual(orders[0].signupEmail, 'default@email.com')
    })

    it('should retrieve multiple orders', async () => {
      const doc = await mongo.insertToRestaurants({ name: 'best-ever', signupEmail: 'default@email.com' })()
      const restaurantId = doc.insertedIds[0].toString()
      await mongo.insertToOrders({ restaurantId, amount: 1, basket: ['a', 'b', 'c'], signupEmail: 'default@email.com', status: 'OPEN' })()
      await mongo.insertToOrders({ restaurantId, amount: 2, basket: ['a'], signupEmail: 'default@email.com', status: 'OPEN' })()
      const res = await makeRequest.get(`/orders/${restaurantId}?status=OPEN`)
      const orders = res.body.orders

      assert.strictEqual(orders.length, 2)
    })

    it('should retrieve all orders', async () => {
      const { body } = await makeRequest.post('/restaurants/create', { name: 'simply-the-best', stripeId: '123' })
      await makeRequest.post('/charge', { restaurantId: body.doc._id, source: 'stripe-source', amount: 1, basket: ['a', 'b', 'c'] })
      await makeRequest.post('/charge', { restaurantId: body.doc._id, source: 'stripe-source', amount: 2, basket: ['a'] })

      const res = await makeRequest.get('/orders/' + body.doc._id)
      assert.strictEqual(res.body.orders.length, 2)
    })

    it('should not retrieve orders against another restaurant', async () => {
      const doc = await mongo.insertToRestaurants({ name: 'best-ever', signupEmail: 'default@email.com' })()
      const restaurantId = doc.insertedIds[0].toString()
      const { body } = await makeRequest.post('/restaurants/create', { name: 'simply-the-best', stripeId: '123' })
      await makeRequest.post('/charge', { restaurantId: body.doc._id, source: 'stripe-source', amount: 1, basket: ['a', 'b', 'c'] })
      await makeRequest.post('/charge', { restaurantId: body.doc._id, source: 'stripe-source', amount: 2, basket: ['a'] })

      const res = await makeRequest.get('/orders/' + restaurantId)
      assert.strictEqual(res.body.orders.length, 0)
    })

    it('should error if user does not have access to restaurant', async () => {
      const doc = await mongo.insertToRestaurants({ name: 'best-ever', signupEmail: 'another@email.com' })()
      const restaurantId = doc.insertedIds[0].toString()
      await makeRequest.post('/charge', { restaurantId, source: 'stripe-source', amount: 1, basket: ['a', 'b', 'c'] })
      await makeRequest.post('/charge', { restaurantId, source: 'stripe-source', amount: 2, basket: ['a'] })

      const res = await makeRequest.get('/orders/' + restaurantId)
      assert.strictEqual(res.body.message, 'User does not have access to restaurant')
    })
  })

  describe('Patch order', () => {
    beforeEach(async () => {
      await mongo.deleteAllRestaurants()
      await mongo.deleteAllOrders()
      await mongo.deleteAllCounters()
    })

    it('should patch a restaurant', async () => {
      const doc = await mongo.insertToRestaurants({ name: 'best-ever', signupEmail: 'default@email.com' })()
      const { body } = await makeRequest.post('/charge', { restaurantId: doc.insertedIds[0], source: 'stripe-source', amount: 1, basket: ['a', 'b', 'c'] })
      const res = await makeRequest.post('/orders/patch/' + body.order._id, { status: 'CLOSED' })
      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.message, 'Order patched successfully')

      const orders = await mongo.finderFromOrdersEmpty()

      assert.strictEqual(orders.length, 1)
      assert.strictEqual(orders[0].amount, 1)
      assert.strictEqual(orders[0].signupEmail, 'default@email.com')
      assert.strictEqual(orders[0].status, 'CLOSED')
      assert.strictEqual(orders[0].restaurantId, doc.insertedIds[0].toString())
    })

    it('should error if user does not have access to restaurant', async () => {
      const doc = await mongo.insertToRestaurants({ name: 'best-ever', signupEmail: 'another@email.com' })()
      const { body } = await makeRequest.post('/charge', { restaurantId: doc.insertedIds[0], source: 'stripe-source', amount: 1, basket: ['a', 'b', 'c'] })
      const res = await makeRequest.post('/orders/patch/' + body.order._id, { status: 'CLOSED' })
      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.message, 'User does not have access to restaurant')

      const orders = await mongo.finderFromOrdersEmpty()

      assert.strictEqual(orders.length, 1)
      assert.strictEqual(orders[0].amount, 1)
      assert.strictEqual(orders[0].signupEmail, 'default@email.com')
      assert.strictEqual(orders[0].status, 'OPEN')
      assert.strictEqual(orders[0].restaurantId, doc.insertedIds[0].toString())
    })
  })
})
