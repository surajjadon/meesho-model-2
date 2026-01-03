import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { logAction } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { generateTokens } from '../utils/generateToken';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      const { accessToken, refreshToken } = generateTokens(user._id.toString());

      const userResponse = {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: accessToken,
        refreshToken: refreshToken
      };

      await logAction(
        user._id.toString(),
        user.name,
        "REGISTER",
        "Auth",
        `New user registered: ${user.email}`,
        "GLOBAL"
      );

      res.status(201).json(userResponse);
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
    // FIX: Catch Mongoose Validation Errors (e.g., Weak Password)
    if (error.name === 'ValidationError') {
      // Extract the first validation message to show to the user
      const message = Object.values(error.errors).map((val: any) => val.message)[0];
      return res.status(400).json({ message });
    }
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Auth user & get token (Login)
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');

    // Generic error message to prevent email enumeration
    const invalidCredentialsMsg = 'Invalid email or password';

    if (user && (await user.comparePassword(password))) {
      const { accessToken, refreshToken } = generateTokens(user._id.toString());

      const userResponse = {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: accessToken,
        refreshToken: refreshToken
      };
    
      await logAction(
        user._id.toString(), 
        user.name, 
        "LOGIN", 
        "Auth", 
        `User logged in from IP: ${req.ip || 'Unknown'}`,
        "GLOBAL"
      );

      res.json(userResponse);
    } else {
      // FIX: Use generic message
      res.status(401).json({ message: invalidCredentialsMsg });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Accept Invite & Set Password
 * @route   POST /api/auth/accept-invite
 * @access  Public
 */
export const acceptInvite = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token and Password are required." });
    }

    const user = await User.findOne({
      inviteToken: token,
      inviteTokenExpire: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired invitation token." });
    }

    // Set new password (this will trigger the Schema Validation on save)
    user.password = password; 
    user.status = "active";
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

    res.status(200).json({ success: true, message: "Account verified!" });

  } catch (error: any) {
    // FIX: Catch Mongoose Validation Errors (e.g., Weak Password)
    if (error.name === 'ValidationError') {
        const message = Object.values(error.errors).map((val: any) => val.message)[0];
        return res.status(400).json({ message });
    }
    console.error("Invite Error:", error);
    res.status(500).json({ message: "Server error processing invite" });
  }
};

/**
 * @desc    Refresh Access Token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body; 

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string };

    const user = await User.findById(decoded.id);
    if (!user) {
        return res.status(401).json({ message: 'User not found' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id.toString());

    return res.json({
        accessToken,
        refreshToken: newRefreshToken
    });
  } catch (error) {
    return res.status(403).json({ message: 'Invalid refresh token' });
  }
};