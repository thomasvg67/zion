// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//    host: "mail.zoomlabs.in", // replace with actual SMTP
//   port: 587,
//   secure: false,
//   auth: {
//     user: process.env.MAIL_USER,
//     pass: process.env.MAIL_PASS
//   }
// });

// transporter.verify((error, success) => {
//   if (error) {
//     console.error("❌ SMTP Connection Error:", error);
//   } else {
//     // console.log("✅ SMTP Server is ready to send messages");
//   }
// });


// module.exports = transporter;


const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: "mail.zoomlabs.in",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // For self-signed certificates
  }
});

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Connection Error:", error);
  } else {
    // console.log("✅ SMTP Server is ready to send messages");
    // console.log("Configuration:", {
    //   host: transporter.options.host,
    //   port: transporter.options.port,
    //   secure: transporter.options.secure,
    //   user: transporter.options.auth.user
    // });
  }
});

module.exports = transporter;