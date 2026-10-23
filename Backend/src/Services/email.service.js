const nodemailer = require("nodemailer");
const axios = require("axios");

// Create SMTP transporter as fallback or primary sender
let transporter;
try {
  if (process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD) {
    // 1. Direct Gmail App Password (most reliable, sends to any recipient)
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || process.env.GOOGLE_USER,
        pass: process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD,
      },
    });

    transporter.verify((error) => {
      if (error) {
        console.warn("Gmail App Password SMTP Verification Warning:", error.message);
      } else {
        console.log("✓ Gmail App Password SMTP transporter is ready");
      }
    });
  } else if (process.env.GOOGLE_USER && process.env.GOOGLE_REFRESH_TOKEN) {
    // 2. Google OAuth2
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

    transporter.verify((error) => {
      if (error) {
        console.warn("SMTP Verification Warning (can be ignored if using Resend or App Password):", error.message);
      } else {
        console.log("✓ SMTP fallback transporter is ready");
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
      console.warn("Resend HTTP Email send failed, attempting SMTP fallback:", error.response?.data?.message || error.message);
    }
  }

  // 2. Fallback to Nodemailer SMTP
  if (transporter) {
    try {
      const fromAddress = process.env.EMAIL_USER || process.env.GOOGLE_USER;
      const info = await transporter.sendMail({
        from: `"PrepAI" <${fromAddress}>`,
        to,
        subject,
        text,
        html,
      });

      console.log("Email sent successfully via SMTP. MessageId:", info.messageId);
      return;
    } catch (error) {
      console.warn("SMTP Email send failed:", error.message);
    }
  }

  console.warn(`[EMAIL NOTICE] Real email could not be delivered to ${to} (Resend free sandbox only delivers to registered account email; SMTP requires Gmail App Password). Use the logged OTP to verify.`);
}

module.exports = {
    sendEmail
}