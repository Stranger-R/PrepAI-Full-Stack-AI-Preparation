const mongoose = require('mongoose');


const sessionSchema = new mongoose.Schema({

    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "users",
        required : true,
    },

    token : {
        type : String,
        required : true,
    },

    ip : {
        type : String,
        required : true,
        
    },
    
    userAgent : {
        type : String,
        required : true,
        
    },

    
    revoked : {
        type : Boolean,
        default : false,
        
    },


}, {
    timestamps : true
})




const sessionModel = mongoose.model('sessions', sessionSchema);

module.exports = sessionModel;
