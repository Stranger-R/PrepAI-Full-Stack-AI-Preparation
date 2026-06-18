require('dotenv').config()

const app = require('./src/app');
const ConnectDB = require('./src/config/db');


ConnectDB().catch(() => process.exit(1));




const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server Run On PORT ${PORT}`);
})      