const aws = require('aws-sdk')
const ses = new aws.SES()

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

module.exports = {
  sendWelcomeEmail
}
