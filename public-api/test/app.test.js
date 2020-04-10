'use strict'

const assert = require('assert')
const mongo = require('../src/mongo')

const makeRequest = require('./make-request')

describe('Ping', () => {
  it('should return message', async () => {
    const res = await makeRequest.get('/ping')

    assert.strictEqual(res.status, 200)
    assert.deepStrictEqual(res.body, { message: 'Welcome to the internet!' })
  })
})

describe('Get restaurants', () => {
  before(async () => {
    await mongo.deleteAllRestaurants()
  })

  after(async () => {
    await mongo.close()
  })

  it('should return a list of restaurants', async () => {
    await mongo.insertToRestaurants({ name: 'best-ever' })()
    await mongo.insertToRestaurants({ name: 'best-best-ever' })()
    const res = await makeRequest.get('/restaurants')

    assert.strictEqual(res.status, 200)
    assert.deepStrictEqual(res.body.length, 2)
    assert.deepStrictEqual(res.body[0].name, 'best-ever')
    assert.deepStrictEqual(res.body[1].name, 'best-best-ever')
  })
})
