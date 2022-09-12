const jwt = require("jsonwebtoken");

const conf = require("../../configs/config.json")
const xlog = require("../../libs/winston")

const verifyLoggedToken = (req, res, next) => {
    const token =
        req.body.token || req.query.token || req.headers["x-access-token"];
    // xlog.info("token", token);
    if (!token) {
        return res.json({message: "A token is required for authentication", success: false});
    }
    try {
        xlog.info(token);
        const decoded = jwt.verify(token, conf.JWT_SECRET);
        xlog.info("after verify token");
        // xlog.info(decoded.action);
        xlog.info(decoded.id);
        if (decoded.action === "logged") {
            req.body.userId = decoded.id;
        } else {
            return res.json({message: "Invalid token 1", success: "false"});
        }
        
    } catch (err) {
        return res.json({message: "Invalid token 2", success: "false"});
    }
    return next();
};

module.exports = verifyLoggedToken;