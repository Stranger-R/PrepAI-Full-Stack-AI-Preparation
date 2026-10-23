require('dotenv').config()

const app = require('./src/app');
const ConnectDB = require('./src/config/db');


async function startServer() {
    try {
        await ConnectDB();
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server Run On PORT ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();      