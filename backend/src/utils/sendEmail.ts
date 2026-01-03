import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
interface EmailOptions {
  email: string;
  subject: string;
  html: string;
}

const sendEmail = async (options: EmailOptions): Promise<void> => {
  // 1. Create Transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD, // App Password if using Gmail
    },
  });

  // 2. Define Email Options
  const mailOptions = {
    from: `"Store Manager Team" <${process.env.EMAIL_USERNAME}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  // 3. Send Email
  await transporter.sendMail(mailOptions);
};

export default sendEmail;