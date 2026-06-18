const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({

    username : {
        type : String,
        unique : [true, "username already taken"],
        required : true,
    },

    email : {
        type : String,
        unique : [true, "Email already Exists."],
        required : true,

    },

    password : {
        type : String,
        required : true,
        
    },

    verified : {
        type : Boolean,
        default : false
    },
    


}, {
    timestamps : true
})




const userModel = mongoose.model('users', UserSchema);

module.exports = userModel;
