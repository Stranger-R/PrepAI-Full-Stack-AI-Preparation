const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express();

const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
        if (allowedOrigins.includes(origin) || isLocalhost) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json())
app.use(cookieParser())

// nodemon reload comment 2



const authRouter = require('./routes/auth.routes');
const interviewRouter = require('./routes/interview.routes');

app.use('/api/auth', authRouter)

app.use('/api/interview', interviewRouter)




module.exports = app;
