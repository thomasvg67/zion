require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: "mail.zoomlabs.in",
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // temp for local testing
  }
});

transporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP verify failed:", err);
  } else {
    console.log("✅ SMTP verified");
  }
});

transporter.sendMail({
  from: process.env.MAIL_USER,
  to: 'thomasvgvpkl123@gmail.com', // or your test email
  subject: 'ZoomLabs Test Email',
  text: 'Hello! This is a test email from ZoomLabs SMTP setup.'
}, (err, info) => {
  if (err) {
    console.error("❌ Email failed:", err);
  } else {
    console.log("✅ Email sent:", info.response);
  }
});
