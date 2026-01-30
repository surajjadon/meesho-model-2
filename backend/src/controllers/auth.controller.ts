import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { logAction } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { generateTokens } from '../utils/generateToken';
import sendOtp from '../utils/sendOtp';
import crypto from "crypto";
import bcrypt from "bcrypt";
//otp generation helper
export function generateOTP(length: number = 6): string {
  const digits = "0123456789";
  let otp = "";
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % digits.length];
  }
  return otp;
}

//hash and send otp helper
const generateAndSendOtp = async (user: any) => {
  const otp = generateOTP();
  const hashedOtp = await bcrypt.hash(otp, 10);

  user.otp = hashedOtp;
  user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
   // 10 Minutes
  await user.save();

  await sendOtp(user.email, otp);
};

// token response helper
const sendTokenResponse = (user: any, statusCode: number, res: Response,message: string) => {
  const { accessToken, refreshToken } = generateTokens(user._id.toString());

  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction, // false on localhost, true on https
    sameSite: isProduction ? "strict" as const : "lax" as const,
  };

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);

  res.status(statusCode).json({
    message: message,
    _id: user._id,
    name: user.name,
    email: user.email,
    token: accessToken,
    refreshToken: refreshToken
  });
};

//controllers

// register user controller
export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists. Please try to login.' });
    }

    // Create user without OTP first
    const user = await User.create({
      name,
      email,
      password,
      isVerified: false
    });

    // Use Helper
    await generateAndSendOtp(user);

    return res.status(201).json({
      message: "OTP sent to your email. Please verify to continue."
    });

  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// verify otp controller
export const verifyOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email }).select("+otp +otpExpire");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified. Please login." });
    }

    if (!user.otp || user.otpExpire < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Update user status
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    // Use Helper for Response
    return sendTokenResponse(user, 201, res,"Account verified successfully.");

  } catch (error: any) {
    res.status(500).json({ message: "Server error" });
  }
};

// resend otp controller
export const resendOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Use Helper
    await generateAndSendOtp(user);
    return res.status(200).json({
      message: "OTP resent successfully."
    });
  } catch (error: any) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// login user controller
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');
    const invalidCredentialsMsg = 'Invalid email or password';

    if (!user) {
      return res.status(401).json({ message: invalidCredentialsMsg });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: 'Account not verified. Please verify OTP.' });
    }

    if (user && (await user.comparePassword(password))) {
      
      await logAction(
        user._id.toString(),
        user.name,
        "LOGIN",
        "Auth",
        `User logged in from IP: ${req.ip || 'Unknown'}`,
        "GLOBAL"
      );

      // Use Helper for Response
      return sendTokenResponse(user, 200, res, "Login successful.");

    } else {
      res.status(401).json({ message: invalidCredentialsMsg });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

/// reset password otp controller
export const resetPasswordotp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;    

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    } 

    // Use Helper
    await generateAndSendOtp(user);

    return res.status(200).json({
      message: "OTP sent successfully to reset Password."
    });

  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
// reset password controller
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;   
    const user = await User.findOne({ email }).select("+otp +otpExpire");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    } 
    
    if (!user.otp || user.otpExpire < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    } 
    
    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid OTP" });
    } 
    
    user.password = newPassword;
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();  
    
    return res.status(200).json({ message: "Password reset successfully." });

  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  } 
};

// accept invite controller
export const acceptInvite = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      inviteToken: token,
      inviteTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired invitation token." });
    }

    user.password = password;
    user.status = "active";
    user.isVerified = true;
    user.inviteToken = undefined;
    user.inviteTokenExpire = undefined;

    await user.save();

    await logAction(
      user._id.toString(),
      user.name,
      "ACTIVATE",
      "Auth",
      `User accepted invitation and set password`,
      "GLOBAL"
    );

    // Option: Auto-login user here using sendTokenResponse(user, 200, res) if desired.
    res.status(200).json({ success: true, message: "Account verified!" });

  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map((val: any) => val.message)[0];
      return res.status(400).json({ message });
    }
    console.error("Invite Error:", error);
    res.status(500).json({ message: "Server error processing invite" });
  }
};

// refresh token controller
export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string };

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const tokens = generateTokens(user._id.toString());

    return res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    return res.status(403).json({ message: 'Invalid refresh token' });
  }
};