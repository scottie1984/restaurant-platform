const STRIPE_KEY = process.env.STRIPE_KEY
const stripe = require('stripe')(STRIPE_KEY)

const connect = code => stripe.oauth.token({
  grant_type: 'authorization_code',
  code: code
})

const charge = ({ amount, source, signupEmail, stripeId }) => stripe.charges.create({
  amount,
  currency: 'gbp',
  source,
  receipt_email: signupEmail
}, { stripeAccount: stripeId })

module.exports = {
  connect,
  charge
}
