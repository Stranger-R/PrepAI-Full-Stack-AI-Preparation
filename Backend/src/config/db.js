const mongoose = require('mongoose');
const dns = require('dns');

try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
    // Keep system DNS if custom DNS cannot be set
}

async function ConnectDB() {
    const primaryUrl = process.env.MONGO_URL;
    const fallbackUrl = process.env.LOCAL_MONGO_URL || "mongodb://127.0.0.1:27017/PrepAI";

    if (primaryUrl) {
        try {
            await mongoose.connect(primaryUrl, { serverSelectionTimeoutMS: 5000 });
            console.log("Server Is Connected To Primary MongoDB");
            return;
        } catch (error) {
            console.warn(`[DB Warning] Failed to connect to primary MongoDB (${error.message}). Attempting fallback to local MongoDB...`);
        }
    }

    try {
        await mongoose.connect(fallbackUrl, { serverSelectionTimeoutMS: 5000 });
        console.log(`Server Is Connected To Fallback MongoDB (${fallbackUrl})`);
    } catch (fallbackError) {
        console.error("All MongoDB connections failed:", fallbackError.message);
        throw fallbackError;
    }
}

module.exports = ConnectDB;