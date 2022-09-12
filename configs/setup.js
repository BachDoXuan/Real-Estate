const mongoose = require("mongoose");

const config = require('./config.json')

const xlog = require("../libs/winston")

const MONGO_URI = config.mongodb.url + config.mongodb.database;


exports.connectMongo = () => {
    // Connecting to the database
    mongoose
      .connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      })
      .then(() => {
        xlog.info("Successfully connected to database");
      })
      .catch((error) => {
        xlog.info("database connection failed. exiting now...");
        console.error(error);
        process.exit(1);
      });
  };