const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


async function sendOtpMail(to, otp) {
  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: 'Your OTP',
    text: `Your verification OTP is: ${otp}`,
  });
}

module.exports = { transporter, sendOtpMail };
