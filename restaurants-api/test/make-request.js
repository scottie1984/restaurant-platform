'use strict'

const request = require('supertest')
const app = require('../src/app')

function get (resource) {
  return request(app)
    .get(resource)
    .set('Origin', 'http://localhost:3000')
}

function post (resource, body) {
  return request(app)
    .post(resource)
    .send(body)
}

module.exports = {
  get,
  post
}
