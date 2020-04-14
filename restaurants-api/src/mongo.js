const mf = require('mongo-func')
const ObjectID = require('mongodb').ObjectID
const byId = (id, signupEmail) => ({ _id: new ObjectID(id), signupEmail })

const MONGO_CONN_STR = process.env.ENV_CONFIG === 'PROD' ? process.env.MONGO_CONN_STR : 'mongodb://localhost:27017/'
const MONDO_DB = process.env.MONGO_DB || 'restaurants_platform'
const MONGO_QRY = process.env.ENV_CONFIG === 'PROD' ? process.env.MONGO_QRY : ''

const MONGO_CONN = MONGO_CONN_STR + MONDO_DB + '?' + MONGO_QRY

const restaurantsCollection = 'restaurants'

const finder = mf.find(MONGO_CONN)
const finderFromRestaurants = finder(restaurantsCollection)
const finderFromRestaurantsEmpty = finderFromRestaurants({})

const inserter = mf.insert(MONGO_CONN)
const insertToRestaurants = inserter(restaurantsCollection)

const remover = mf.remove(MONGO_CONN)
const deleteRestaurants = remover(restaurantsCollection)
const deleteAllRestaurants = deleteRestaurants({})

const updater = mf.update(MONGO_CONN)
const updateToRestaurants = updater(restaurantsCollection)
const updateByIdToRestaurants = updateToRestaurants(byId)

const close = async () => {
  const db = await mf.getConnection(MONGO_CONN)
  db.close()
}

module.exports = {
  finderFromRestaurantsEmpty,
  finderFromRestaurants,
  insertToRestaurants,
  deleteAllRestaurants,
  close,
  updateByIdToRestaurants
}
