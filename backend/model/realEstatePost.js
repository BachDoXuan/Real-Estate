'use strict'

const mongoose = require("mongoose");

const category = new mongoose.Schema({
    name: String,
    description: String
}, {
    timestamps: true    
})

const postDescription = new mongoose.Schema({
    area: Number,
    price: String,
    interior: String,
    address: String
}, {
    timestamps: true
})

const userContact = new mongoose.Schema({
    fullname: String,
    phoneNumber: String,
    email: String,
    address: String
}, {
    timestamps: true
})

const realEstatePostSchema = new mongoose.Schema({
    userId: {
        type: String
    },
    category: category,
    title: {
        type: String
    },
    type: {
        type: String
    },
    description: postDescription,
    timeStart: {
        type: String
    },
    timeEnd: {
        type: String
    },
    image: {
        type: String
    },
    video: {
        type: String
    },
    userContact: userContact
}, {
    timestamps: true
})

/*
* TODO: how to save image and video?
* how many images allowed? how many videos allowed?
*/

module.exports = mongoose.model("realEstatePost", realEstatePostSchema);