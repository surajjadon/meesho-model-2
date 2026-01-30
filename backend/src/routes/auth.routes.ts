import express from 'express';
import { 
  registerUser, 
  loginUser, 
  acceptInvite, 
  refreshToken, 
  verifyOtp, 
  resendOtp, 
  resetPassword, 
  resetPasswordotp 
} from '../controllers/auth.controller';
import { getGoogleUrl, googleCallback } from '../controllers/google.controller';
import { validate } from '../middleware/validateData';
import { 
  RegisterSchema, 
  LoginSchema, 
  ResetPasswordFormSchema, 
  VerifyOtpSchema, 
  NewPasswordSchema, 
  AcceptInviteSchema, 
  RefreshTokenSchema 
} from '../validations/auth.validation';

const router = express.Router();

// Register
router.post('/register', validate(RegisterSchema), registerUser);

// Login
router.post('/login', validate(LoginSchema), loginUser);

// OTP
router.post('/verify-otp', validate(VerifyOtpSchema), verifyOtp);
router.post('/resend-otp', validate(ResetPasswordFormSchema), resendOtp); // Reusing email-only schema

// Password Reset
router.post('/forgot-password', validate(ResetPasswordFormSchema), resetPasswordotp);
router.post('/reset-password', validate(NewPasswordSchema), resetPassword);

// Invite & Refresh
router.post('/accept-invite', validate(AcceptInviteSchema), acceptInvite);
router.post('/refresh-token', validate(RefreshTokenSchema), refreshToken);

router.get('/google/url', getGoogleUrl);
router.post('/google/callback', googleCallback);

export default router;