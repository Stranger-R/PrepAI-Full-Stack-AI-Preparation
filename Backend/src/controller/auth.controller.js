const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");
const OTPGenerate = require('../utils/utils');
const emailService = require('../Services/email.service');
const otpModel = require('../models/otp.model');
const crypto = require('crypto');
const sessionModel = require('../models/session.model');

const tokenBlackListModel = require('../models/blackList.model');

// userRegister Controller 
//  /api/auth/register, POST

/**
 * - user Register Controller
 * - POST /api/auth/register
 */

async function userRegisterController(req, res) {
    try {
        const {username, email, password} = req.body;

         // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Please provide username, email and password",
                status: "failed"
            });
        }

        // Check existing user
        const isExists = await userModel.findOne({ 
            $or : [ {username}, {email} ]
         });

        if (isExists) {
            return res.status(400).json({
                message: "User already exists with this username or email",
                status: "failed"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await userModel.create({
            username,
            email,
            password: hashedPassword,
            verified: false,

        });

        const { otp } = OTPGenerate.generateOTP();
        
        // Log OTP to server console so developer can copy it from logs if SMTP fails
        console.log(`[DEV_OTP_LOG] Generated OTP for ${email}: ${otp}`);
        
        const html = OTPGenerate.verificationEmailTemplate(
            username,
            otp
        );
        
        const otpHash = crypto
            .createHash("sha256")
            .update(String(otp))
            .digest("hex");

        await otpModel.create({
            email,
            user: user._id,
            otpHash
        });

        // Run email sending in background (don't await) so SMTP timeout doesn't hang the registration API
        emailService.sendEmail({
            to: email,
            subject: "Verify Your Email Address",
            html: html
        }).catch(err => console.error("Async email error:", err));

        return res.status(201).json({
            success: true,
            message: "Registration successful. Please verify your email.",
            // accessToken,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            }
        });


        // if (!process.env.JWT_SECRET) {
        //     return res.status(500).json({
        //         message: "Server configuration error"
        //     });
        // }

        // // Generate token
        // const token = jwt.sign(
        //     { user: user._id, username : user.username },
        //     process.env.JWT_SECRET,
        //     {
        //         expiresIn: "1d"
        //     }
        // );

        // // Set cookie
        // res.cookie("token", token);

        // return res.status(201).json({
        //     message: "User Registered Successfully",
        //     token,
        //     user: {
        //         _id: user._id,
        //         username: user.username,
        //         email: user.email
        //     }
        // });

    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({
            message: error.message || "Internal server error during registration",
            status: "failed"
        });
    }
}


/**
 * - user Login Controller
 * - POST /api/auth/login
 */

async function userLoginController(req, res) {
    try {
        const {email, password} = req.body;

        const user = await userModel.findOne({
            email
        });

        if(!user){
            return res.status(400).json({
                message : "Email or Password is Invalid."
            });
        }

        if (!user.verified) {
            return res.status(403).json({
                success: false,
                message: "Email not verified"
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if(!isValidPassword){
            return res.status(401).json({
                message : "Email or Password is Invalid."
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: "Server configuration error"
            });
        }

        // Generate token
        const token = jwt.sign(
            { user: user._id, username : user.username },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        await sessionModel.create({
            user: user._id,
            token,
            ip: req.ip,
            userAgent: req.headers["user-agent"]
        });

        // Set cookie
        res.cookie("token", token);

        return res.status(200).json({
            message: "User LoggedIn Successfully",
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            message: error.message || "Internal server error during login",
            status: "failed"
        });
    }
}


async function userLogoutController(req, res) {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(200).json({
                message: "User logged out successfully",
            });
        }

        res.clearCookie('token');

        await tokenBlackListModel.create({
            token : token
        });

        await sessionModel.deleteOne({
            token
        });

        return res.status(200).json({
            message: "User logged out successfully",
        });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({
            message: error.message || "Internal server error during logout",
            status: "failed"
        });
    }
}

async function GetMeController(req, res) {
    try {
        const user = await userModel.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        if (!user.verified) {
            return res.status(403).json({
                success: false,
                message: "Email not verified"
            });
        }

        return res.status(200).json({
            message: "User detail fetched Successfully",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("GetMe error:", error);
        return res.status(500).json({
            message: error.message || "Internal server error",
            status: "failed"
        });
    }
}

async function verifyEmail(req, res) {
    try {

        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        const otpHash = crypto
            .createHash("sha256")
            .update(String(otp))
            .digest("hex");


        const otpData = await otpModel.findOne({
            email,
            otpHash,
        });


        if (!otpData) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }


        const user = await userModel.findByIdAndUpdate(
            otpData.user,
            {
                verified: true,
            },
            {
                new: true
            }
        );


        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }


        await otpModel.deleteMany({
            user: otpData.user
        });


        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: "Server configuration error"
            });
        }


        const token = jwt.sign(
            {
                user: user._id,
                username: user.username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );


        await sessionModel.create({
            user: user._id,
            token,
            ip: req.ip,
            userAgent: req.headers["user-agent"]
        });


        res.cookie("token", token);


        return res.status(200).json({
            success: true,
            message: "Email verified successfully",
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            }
        });


    } catch (error) {
        console.error("Verify email error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

module.exports = {

    userRegisterController,
    userLoginController,
    userLogoutController,
    GetMeController,
    verifyEmail,

};
