const tokenBlackListModel = require('../models/blackList.model');
const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');


async function authMiddleware(req, res, next) {
    
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized access, token is missing",
        });
    }

    const isBlacklisted = await tokenBlackListModel.findOne({
        token
    })

    if(isBlacklisted){
        return res.status(401).json({
            message: "Unauthorized access, token is invaild",
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.user).select('-password');

        if (!user) {
            return res.status(401).json({
                message: "Unauthorized access, user not found",
            });
        }

        req.user = user;
        next();

    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid",
        });
    }
}


// async function authSystemUser(req, res, next) {
//     // console.log("Test 1");
    
    
//     const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

//     // console.log("Test 2", token);

//     if (!token) {
//         return res.status(401).json({
//             message: "Unauthorized access, token is missing",
//         });
//     }

//     const isBlacklisted = await tokenBlackListModel.findOne({
//         token
//     })

//     if(isBlacklisted){
//         return res.status(401).json({
//             message: "Unauthorized access, token is invaild",
//         });
//     }

//     // console.log("Test 3");

//     try {
//         // console.log("Test 4 enter ");
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         const user = await userModel.findById(decoded.userId).select("+systemUser");

//         if (!user.systemUser) {
//             return res.status(403).json({
//                 message: "Forbidden access, not a system user",
//             });
//         }

//         req.user = user;
//         // console.log("Finish Auth");
        
//         next();


//     } catch (error) {
//         // console.log("Test 6 error");
//         return res.status(401).json({
//             message: "Unauthorized access, token is invalid",
//         });
//     }

// }

// async function authSystemMiddleware(req, res, next) {

//     const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

//     if (!token) {
//         return res.status(401).json({
//             message: "Unauthorized access, token is missing",
//         });
//     }

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         const user = await userModel.findById(decoded.userId).select("+systemUser");

//         if (!user.systemUser) {
//             return res.status(403).json({
//                 message: "Forbidden access, not a system user",
//             });
//         }

//         req.user = user;
//         next();
//     } catch (error) {
//         return res.status(401).json({
//             message: "Unauthorized access, token is invalid",
//         });
//     }
// }


module.exports = {

    authMiddleware,
    // authSystemUser
};