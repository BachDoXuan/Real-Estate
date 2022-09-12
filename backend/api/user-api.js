const axios = require('axios')
const User = require('../model/user')
const jwt = require('jsonwebtoken')
const verifyLoggedToken = require("../middleware/verifyLoggedToken");

const Multer = require('multer');
const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // no larger than 5mb
    },
  });

const {Storage} = require('@google-cloud/storage');

// Instantiate a storage client
const storage = new Storage();
const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);

const bcrypt = require('bcrypt')

const xlog = require("../../libs/winston")

const conf = require("./../../configs/config.json")

const JWT_SECRET = conf.JWT_SECRET

const SALT_ROUNDS = 10;

const twilioClient = require('twilio')(conf.twilio.accountSid, conf.twilio.authToken);

const STRONG_REGEX = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})');

const from = "123456789";
const to = "123456789";

const FIVE_MINUTES = 300000;
const TEN_SECONDS = 10000;

function getRandomDigit() {
    return Math.floor(Math.random() * 10);
}

function getRandomPasscode() {
    let res = ""
    for (let i = 0; i < 4; i++) {
        res += getRandomDigit().toString();
    }
    return res;
}

function userApi (app) {

    app.post('/user/registerPhone', async (req, res) => {
        try {
            const phoneNumber = req.body.phoneNumber;
            const role = req.body.role;

            // verify phone number
            const passcode = getRandomPasscode();
            // TODO: review if using jwt is better
            let expirationTime = Date.now() + FIVE_MINUTES; // 5 minutes later

            // TODO: modify this test code to production code
            // TODO: temporarily comment out to save cost calling twilio api, recover this code
            // later.
            // twilioClient.messages.create({
            //     body: passcode,
            //     from: from,
            //     to: to
            // })
            // .then(message => xlog.info(message.sid))
            // .catch(error => xlog.info(error))

            let user = new User({
                phoneNumber: phoneNumber,
                role: role,
                passcode: passcode,
                passcodeExpirationTime: expirationTime
            });
            // TODO: use logging system to log to console or file, etc ... 
            xlog.info(user);
            await user.save();
            xlog.info("save user OK");

            return res.json({ user: {"_id": user._id}, success: true });

        } catch (error) {
            xlog.info(error);
            return res.json({ message: error, success: false })
        }
    })

    app.post('/user/verifyPhone', async (req, res) => {
        xlog.info("verifyPhone");

        const userId = req.body._id;
        const passcode = req.body.passcode;
        const user = await User.findOne({_id: userId, passcode: passcode });
        if (!user) {
            return res.json({ message: 'User not found!', success: false });
        }
        let now = Date.now();
        if (now > user.passcodeExpirationTime) {
            return res.json({ message: 'Passcode expired!', success: false});
        }
        xlog.info(user.phoneConfirmed);

        if (!user.phoneConfirmed) {
           await User.updateOne({_id: userId}, {$set: {phoneConfirmed: true}});
        }
        // TODO: send jwt token to continue register account
        let payload = {
            id: user._id,
            action: "registerAccount"
        };
        let options = {
            expiresIn: '2h'
        };
        let token = jwt.sign(payload, JWT_SECRET, options);
        return res.json({ user: {"_id": user._id}, token: token, success: true });

    })

    app.post('/user/registerAccount', async (req, res) => {
        try {
            // verify phone number first
            const userId = req.body._id;
            const username = req.body.username;
            const email = req.body.email;
            const password = req.body.password;
            const token = req.body.token;

            let tokenInfo;
            try {
                tokenInfo = jwt.verify(token, JWT_SECRET);
            } catch(error) {
                xlog.info(error);
                return res.json({message: "Token verification failed", success: false});
            }
            xlog.info(tokenInfo);
            if (tokenInfo.action !== "registerAccount") {
                return res.json({message: "Wrong token type", success: false});
            }

            if (! STRONG_REGEX.test(password)) {
                return res.json({message: "Password must contain at least 8 characters long \
                and contain at least 1 upper case, 1 lower case alphabet & 1 number & \
                1 special character", success: false});
            }

            let user = await User.findOne({ email: email })
            if (user) {
                return res.json({ message: 'Account already exists!', success: false })
            }
            
            user = await User.findOne({_id: userId});

            if (!user) {
                return res.json({ message: "user id not exist", success: false});
            }

            await User.updateOne({_id: userId}, {$set: {
                username: username,
                email: email,
                emailConfirmed: true,
                password: bcrypt.hashSync(password, SALT_ROUNDS),
                isConfirmed: true
            }});
            user = await User.findOne({_id: userId});
    
            return res.json({
                user: {
                    _id: user._id
                },
                success: true
            })
        } catch (e) {
            xlog.info(e);
            return res.json({ message: 'Something went wrong', success: false })
        }
    })

    
    app.post('/user/login', async (req, res) => {
        try {
            const email = req.body.email
            const password = req.body.password
    
            const user = await User.findOne({ email: email })
            if (!user) {
                return res.json({ message: 'User not found!', success: false })
            }
    
            if (!bcrypt.compareSync(password, user.password)) {
                xlog.info(password, "vs.", user.password);
                return res.json({ message: 'Password or email is incorrect!', success: false })
            }
    
            let payload = {
                id: user._id,
                action: "logged"
            };
            let options = {
                expiresIn: '7d'
            };
            let token = jwt.sign(payload, JWT_SECRET, options);

    
            if (!token) { return res.json({ message: 'Cannot get token', success: false }) }
    
            return res.json({ user : {
                _id: user._id
            }, token, success: true })
        } catch (e) {
            xlog.info(e);
            return res.json({ message: 'Something went wrong', success: false })
        }
    })

    app.post('/user/change-password', async (req, res) => {
        try {
            const email = req.body.email
            const newPassword = req.body.newPassword
            const currPassword = req.body.currPassword
    
            const user = await User.findOne({ email: email })
    
            if (!user) {
                return res.json({ message: 'User not found!', success: false })
            }

            if (!bcrypt.compareSync(currPassword, user.password)) {
                return res.json({ message: 'Current password is incorrect!', success: false })
            }
    
            if (currPassword === newPassword) {
                return res.json({ message: 'New password cannot be the same as the old one', success: false })
            }

            if (! STRONG_REGEX.test(newPassword)) {
                return res.json({message: "Password must contain at least 8 characters long \
                and contain at least 1 upper case, 1 lower case alphabet & 1 number & \
                1 special character", success: false});
            }

            // Update new password
            await User.updateOne({ email: email }, { $set: { password: bcrypt.hashSync(newPassword, SALT_ROUNDS) } })

            return res.json({ message: 'Password successfuly changed', success: true })
        } catch (error) {
            return res.json({ message: 'Something went wrong', success: false })
        }
    })

    app.post('/user/update-profile', multer.single('file'), verifyLoggedToken, async (req, res) => {
        // app.post('/user/update-profile', verifyLoggedToken, async (req, res) => {
        // update user profile
        xlog.info("/user/update-profile");
        const userId = req.body.userId
        // xlog.info("userID is ", userId);

        const user = await User.findOne({ _id: userId })
        
        xlog.info(user);

        xlog.info(req.file.originalname);

        if (!user) {
            return res.json({ message: 'User not found!', success: false })
        }
        
        const username = req.body.username;
        const birthdate = req.body.birthdate;
        const sex = req.body.sex;
        let profilePicture;
        const address = req.body.address;
        

        // TODO: delete old profile picture
        const blob = bucket.file(req.file.originalname);
        const blobStream = blob.createWriteStream({
            resumable: false,
        });

        blobStream.on('error', err => {
            return res.json({ message: 'Cannot store picture', success: false })
        });

        blobStream.on('finish', () => {
            // The public URL can be used to directly access the file via HTTP.
            profilePicture = format(
              `https://storage.googleapis.com/${bucket.name}/${blob.name}`
            );
            xlog.info(blob.name)
        });
        blobStream.end(req.file.buffer);

        await User.updateOne({ _id: userId }, 
            { $set: { 
                    username: username,
                    birthdate: birthdate,
                    sex: sex,
                    profilePicture: profilePicture,
                    address: address
                } 
        })
        
        return res.json({ message: 'update succeeded', success: true })
    })
}

module.exports = userApi
