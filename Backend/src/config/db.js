const mongoose = require('mongoose');
const dns = require('dns');


dns.setServers(["8.8.8.8", "1.1.1.1"])

async function ConnectDB() {
        mongoose.connect(process.env.MONGO_URL)
        .then(() =>{
            console.log("Server Is Connect To DB");
        })
        .catch(error => {
            console.log("Error Conneting To DB");
            process.exit(1)
        })


}

module.exports = ConnectDB