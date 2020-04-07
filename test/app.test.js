'use strict'

const assert = require('assert')

const makeRequest = require('./make-request')

describe('Ping', () => {

  it('should return message', async () => {
    const res = await makeRequest.get('/ping')

    assert.strictEqual(res.status, 200)
    assert.deepStrictEqual(res.body, { message: 'Welcome to the internet!' })
  })
})
