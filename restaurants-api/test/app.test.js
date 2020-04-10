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

  after(async () => {
    await mongo.close()
  })

  it('should return a list of restaurants', async () => {
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
