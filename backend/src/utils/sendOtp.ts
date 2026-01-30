import sendMail from "./sendEmail"; // rename your current file to sendMail.ts

const sendOtp = async (email: string, otp: string): Promise<void> => {
  const subject = "Verify your email - OTP";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Email Verification</h2>
      <p>Your One-Time Password (OTP) is:</p>
      <h1 style="letter-spacing: 3px;">${otp}</h1>
      <p>This OTP will expire in <strong>10 minutes</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
      <br />
      <p>— Store Manager Team</p>
    </div>
  `;

  await sendMail({
    email,
    subject,
    html,
  });
};

export default sendOtp;
