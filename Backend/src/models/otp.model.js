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
        required: true
    },





}, {
    timestamps: true
});



const otpModel = mongoose.model("otps",otpSchema);


module.exports = otpModel;