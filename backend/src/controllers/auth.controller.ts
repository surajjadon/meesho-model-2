import { Request, Response } from 'express';
import bcrypt from 'bcryptjs'; 
import { User } from '../models/user.model';
import generateToken from '../utils/generateToken';
import { logAction } from '../utils/logger'; // ✅ Imported Logger

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
      const userResponse = {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id.toString()),
      };

      // ✅ AUDIT LOG: New User Registration (Global)
      await logAction(
        user._id.toString(),
        user.name,
        "REGISTER",
        "Auth",
        `New user registered: ${user.email}`,
        "GLOBAL" // 👈 GSTIN is Global for registration
      );

      res.status(201).json(userResponse);
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
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

    if (user && (await user.comparePassword(password))) {
      const userResponse = {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id.toString()),
      };
    
      // ✅ AUDIT LOG: User Login (Global)
      await logAction(
        user._id.toString(), 
        user.name, 
        "LOGIN", 
        "Auth", 
        `User logged in from IP: ${req.ip || 'Unknown'}`,
        "GLOBAL" // 👈 Added 6th Argument (GSTIN)
      );

      res.json(userResponse);
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
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

    // 1. Validate
    if (!token || !password) {
      return res.status(400).json({ message: "Token and Password are required." });
    }

    // 2. Find user by token AND check if token is not expired
    const user = await User.findOne({
      inviteToken: token,
      inviteTokenExpire: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired invitation token." });
    }

    // 3. Set password (plain text, model hashes it)
    user.password = password; 

    // 4. Activate user
    user.status = "active";
    user.inviteToken = undefined;       
    user.inviteTokenExpire = undefined; 

    await user.save(); 

    // ✅ AUDIT LOG: User Activated (Global)
    await logAction(
        user._id.toString(),
        user.name,
        "ACTIVATE",
        "Auth",
        `User accepted invitation and set password`,
        "GLOBAL" // 👈 GSTIN is Global here
    );

    res.status(200).json({ success: true, message: "Account verified!" });

  } catch (error) {
    console.error("Invite Error:", error);
    res.status(500).json({ message: "Server error processing invite" });
  }
};