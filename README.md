## Requirements

* Node 10.13.0
* Mongo

## Set up

The project is made up off:

public-api

A public facing api to get restaurants

restaurants-api

An API for restaurants - requires a logged in user

```
cd public-api
npm install
npm start
```

```
cd restaurants-api
npm install
npm start
```
## Tests
```
cd public-api
npm test
```
```
cd restaurants-api
npm test
```

## Documentation

Please look at the tests folder within each folder to view how to call each endpoint


## CI

CircleCI is set up to deploy the apps on each push to master

## Available APIS

public-api
https://596xiw10i2.execute-api.us-east-1.amazonaws.com/dev/

restaurants-api
https://1moce99ue8.execute-api.us-east-1.amazonaws.com/dev/

