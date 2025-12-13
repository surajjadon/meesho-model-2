import { Request, Response, NextFunction } from 'express';

// Extend the Express Request type again
declare global {
  namespace Express {
    interface Request {
      gstin?: string;
    }
  }
}

export const requireGstin = (req: Request, res: Response, next: NextFunction) => {
  const gstin = req.header('x-gstin'); // We'll pass the selected GSTIN in a custom header

  if (!gstin) {
    return res.status(400).json({ message: 'GSTIN header (x-gstin) is required' });
  }

  req.gstin = gstin;
  // TODO: You could add an extra check here to ensure req.user has access to req.gstin
  next();
};