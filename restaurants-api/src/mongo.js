const mf = require('mongo-func')
const ObjectID = require('mongodb').ObjectID
const byId = id => ({ _id: new ObjectID(id) })

const MONGO_CONN_STR = process.env.ENV_CONFIG === 'PROD' ? process.env.MONGO_CONN_STR : 'mongodb://localhost:27017/'
const MONDO_DB = process.env.MONGO_DB || 'restaurants_platform'
const MONGO_QRY = process.env.ENV_CONFIG === 'PROD' ? process.env.MONGO_QRY : ''

const MONGO_CONN = MONGO_CONN_STR + MONDO_DB + '?' + MONGO_QRY

// generic
const findOner = mf.findOne(MONGO_CONN)
const finder = mf.find(MONGO_CONN)
const inserter = mf.insert(MONGO_CONN)
const remover = mf.remove(MONGO_CONN)
const updater = mf.update(MONGO_CONN)

// restaurants
const restaurantsCollection = 'restaurants'

const findOneFromRestaurants = findOner(restaurantsCollection)
const fineOneByIdRestaurants = findOneFromRestaurants(byId)

const finderFromRestaurants = finder(restaurantsCollection)
const finderFromRestaurantsEmpty = finderFromRestaurants({})

const insertToRestaurants = inserter(restaurantsCollection)

const deleteRestaurants = remover(restaurantsCollection)
const deleteAllRestaurants = deleteRestaurants({})

const updateToRestaurants = updater(restaurantsCollection)
const updateByIdToRestaurants = updateToRestaurants(byId)

// orders
const ordersCollection = 'orders'

const findOneFromOrders = findOner(ordersCollection)
const fineOneByIdOrders = findOneFromOrders(byId)

const finderFromOrders = finder(ordersCollection)
const finderFromOrdersEmpty = finderFromOrders({})

const insertToOrders = inserter(ordersCollection)

const updateToOrders = updater(ordersCollection)
const updateByIdToOrders = updateToOrders(byId)

const deleteOrders = remover(ordersCollection)
const deleteAllOrders = deleteOrders({})

const close = async () => {
  const db = await mf.getConnection(MONGO_CONN)
  db.close()
}

// orders
const countersCollection = 'counters'
const deleteCounters = remover(countersCollection)
const deleteAllCounters = deleteCounters({})

const getNextSequenceValue = async sequenceName => {
  const db = await mf.getConnection(MONGO_CONN)
  const sequenceDocument = await db.counters.findAndModify({
    query: { sequenceName },
    update: { $inc: { sequence_value: 1 } },
    new: true
  })
  return sequenceDocument.sequence_value
}

const startSequence = async sequenceName => {
  const db = await mf.getConnection(MONGO_CONN)
  await db.counters.insert({
    sequenceName,
    sequence_value: 0
  })
}

module.exports = {
  finderFromRestaurantsEmpty,
  finderFromRestaurants,
  insertToRestaurants,
  deleteAllRestaurants,
  updateByIdToRestaurants,
  fineOneByIdRestaurants,

  insertToOrders,
  deleteAllOrders,
  finderFromOrders,
  finderFromOrdersEmpty,
  updateByIdToOrders,
  fineOneByIdOrders,

  deleteAllCounters,
  startSequence,
  getNextSequenceValue,
  close
}
