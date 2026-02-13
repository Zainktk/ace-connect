const nodemailer = require('nodemailer');

// Configure the email transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // App Password for Gmail or API Key for Brevo
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
});

/**
 * Send OTP Email
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit OTP code
 * @param {string} name - User's name
 */
const sendOTPEmail = async (to, otp, name) => {
    try {
        const mailOptions = {
            from: `"AceConnect" <${process.env.EMAIL_USER}>`,
            to,
            subject: 'AceConnect Verification Code',
            text: `Hello ${name}, your OTP for your account verification is ${otp}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h3>AceConnect Verification</h3>
                    <p>Hello <strong>${name}</strong>,</p>
                    <p>Your OTP for your account verification is: <span style="font-size: 20px; font-weight: bold; color: #4CAF50;">${otp}</span></p>
                    <p>If you did not request this, please ignore this email.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`OTP email sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        // Don't throw error to prevent breaking registration flow in dev
        // unless strictly required. In production, this should be handled.
        return false;
    }
};

module.exports = {
    sendOTPEmail,
};
