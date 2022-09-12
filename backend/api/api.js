var express = require('express');
const jwt = require('jsonwebtoken')
var bodyParser = require('body-parser')
var cors = require('cors')

require("../../configs/setup").connectMongo();

const xlog = require("../../libs/winston")

var app = express();
app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const conf = require('../../configs/config.json')
const JWT_SECRET = conf.JWT_SECRET
const userApiRoute = require('./user-api')
const { response } = require('express');

userApiRoute(app)


var port = process.env.PORT || 8080
app.listen(port, function () {
    xlog.info("RealEstate api listening at port %s", port)
})
