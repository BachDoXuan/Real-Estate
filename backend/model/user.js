'use strict'

const mongoose = require("mongoose");

// 1 upperCase, 1 lowerCase, 1 speacial character, 1 number, at least 8 characters
const strongRegex = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})')

const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        // required: true
    },
    phoneConfirmed: {
        type: Boolean,
        default: false
    },
    username: {
        type: String,
        unique: false
    },
    email: {
        type: String,
        unique: false
    },
    emailConfirmed: {
        type: Boolean,
        default: false
    },
    password: {
        type: String,
    },
    role: {
        type: String,
        enum: [
            "realEstateSeller",
            "customer"
        ],
        default: "customer"
    },
    passcode: String,
    passcodeExpirationTime: Number,
    latestResetToken: String,
    isConfirmed: {
        type: Boolean,
        default: false
    },
    birthdate: { type: Date },
    sex: {
        type: String,
        enum: [
            "male",
            "female",
            "other"
        ]
    },
    address: String,
    profilePicture: String

}, {
    timestamps: true
})

module.exports = mongoose.model("user", userSchema);