 // utils/twilioService.js
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendOTP = async (to, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your OTP is ${otp}. It is valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE,
      to: to   // user’s phone number
    });
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendOTP };
