const mongoose = require("mongoose");


const otpSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },


    email: {
        type: String,
        required: true,
    },


    otpHash: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // 5 minutes TTL
    }
}, {
    timestamps: true
});



const otpModel = mongoose.model("otps",otpSchema);


module.exports = otpModel;