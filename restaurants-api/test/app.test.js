'use strict'

const assert = require('assert')
const mongo = require('../src/mongo')
const aws = require('aws-sdk')
const sinon = require('sinon')

const sandbox = sinon.createSandbox()
sandbox.stub(aws, 'SES').returns({
  sendEmail: () => ({
    promise: () => Promise.resolve()
  })
})

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
    })

    it('should insert a restaurant', async () => {
      const res = await makeRequest.post('/restaurants/create', { name: 'simply-the-best' })

      assert.strictEqual(res.status, 200)
      assert.deepStrictEqual(res.body.message, 'Restaurant inserted successfully')
      const restaurants = await mongo.finderFromRestaurantsEmpty()

      assert.strictEqual(restaurants.length, 1)
      assert.strictEqual(restaurants[0].name, 'simply-the-best')
      assert.strictEqual(restaurants[0].signupEmail, 'default@email.com')
      assert.ok(aws.SES.called)
    })
  })

  describe('Get restaurants for user', () => {
    before(async () => {
      await mongo.deleteAllRestaurants()
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
      assert.ok(aws.SES.called)
    })
  })

  describe('Update restaurant', () => {
    before(async () => {
      await mongo.deleteAllRestaurants()
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
      assert.ok(aws.SES.called)
    })
  })
})
