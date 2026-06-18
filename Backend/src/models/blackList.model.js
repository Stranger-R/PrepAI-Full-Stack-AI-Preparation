const mongoose = require('mongoose');


const tokenBlackListSchema = new mongoose.Schema({

    token : {
        type : String,
        required : [true, "Token is Required to blacklist"],
        unique : [true, "Token is already blacklisted"]
    },


}, {
    timestamps : true
})


const tokenBlackListModel = mongoose.model('tokenBlackList', tokenBlackListSchema);

module.exports = tokenBlackListModel;
