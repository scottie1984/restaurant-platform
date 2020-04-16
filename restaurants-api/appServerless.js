const serverless = require('serverless-http');
const app = require('./src/app')

module.exports.handler = serverless(app, {
    binary: ['image/png', 'image/gif', 'image/jpeg', 'image/jpg'],
    request: function (req, event, context) {
        req.event = event;
        req.context = context;
    },
 });