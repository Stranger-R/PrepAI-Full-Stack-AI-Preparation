const nodemailer = require("nodemailer");
const axios = require("axios");

// Create SMTP transporter as fallback
let transporter;
try {
  if (process.env.GOOGLE_USER && process.env.GOOGLE_REFRESH_TOKEN) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        type: "OAuth2",
        user: process.env.GOOGLE_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      },
    });

    transporter.verify((error, success) => {
      if (error) {
        console.warn("SMTP Verification Warning (can be ignored if using Resend):", error.message);
      } else {
        console.log("SMTP fallback transporter is ready");
      }
    });
  }
} catch (e) {
  console.warn("Failed to initialize SMTP transporter:", e.message);
}


async function sendEmail({ to, subject, html, text }) {
  // 1. If RESEND_API_KEY is configured, use the HTTP API (bypasses Render SMTP block!)
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await axios.post("https://api.resend.com/emails", {
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
        to,
        subject,
        html,
        text
      }, {
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        }
      });

      console.log("Email sent successfully via Resend HTTP API. ID:", response.data.id);
      return;
    } catch (error) {
      console.error("Resend HTTP Email send failed:", error.response?.data || error.message);
      return;
    }
  }

  // 2. Fallback to Nodemailer SMTP
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"PrepAI" <${process.env.GOOGLE_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log("Email sent via SMTP:", info.messageId);
    } catch (error) {
      console.error("SMTP Email send failed:", error.message);
    }
  } else {
    console.error("No email service configured. Please provide RESEND_API_KEY or GOOGLE SMTP credentials.");
  }
}


module.exports = {
    sendEmail
}