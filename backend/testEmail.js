"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// testEmail.ts
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
// 1. Load environment variables
dotenv_1.default.config();
const testEmail = async () => {
    console.log("-----------------------------------------");
    console.log("🧪 Testing Email Configuration...");
    console.log("📧 User:", process.env.EMAIL_USERNAME);
    // Do NOT log the full password for security, just check if it exists
    console.log("🔑 Password Present:", process.env.EMAIL_PASSWORD ? "Yes" : "No");
    // 2. Create Transporter
    const transporter = nodemailer_1.default.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD, // Your 16-char App Password
        },
    });
    // 3. Define Email Options
    const mailOptions = {
        from: `"Test Script" <${process.env.EMAIL_USERNAME}>`,
        to: "surajjadon170@gmail.com", // Send it to yourself to verify
        subject: "Test Email from Node.js",
        text: "If you are reading this, your Nodemailer configuration is PERFECT! 🚀",
    };
    try {
        // 4. Send Email
        console.log("⏳ Sending email...");
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ SUCCESS! Email sent.");
        console.log("🆔 Message ID:", info.messageId);
        console.log("-----------------------------------------");
    }
    catch (error) {
        console.error("❌ FAILED to send email.");
        console.error("Error Message:", error.message);
        if (error.code === 'EAUTH') {
            console.log("💡 HINT: Check your EMAIL_USERNAME or EMAIL_PASSWORD. Make sure you are using the App Password, not your login password.");
        }
        console.log("-----------------------------------------");
    }
};
testEmail();
