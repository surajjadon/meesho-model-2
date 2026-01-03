import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/user.model';

import { generateTokens } from '../utils/generateToken';
// Type definition expansion
declare global {
  namespace Express {
    interface Request {
      user?: IUser | null; // Added null for better type safety
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
console.log("DEBUG: Received Token:", token);
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

      // Get user from the token's ID
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        // Use 'return' to stop execution
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      return next(); // Proceed to next middleware
    } catch (error) {
      console.error('Token verification failed:', error);
      // Use 'return' to stop execution
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};


