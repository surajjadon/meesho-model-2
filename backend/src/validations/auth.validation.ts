import { z } from "zod";

// --- 1. Shared Password Logic ---
export const PASSWORD_REQUIREMENTS = [
  { id: 'min', label: "At least 8 characters", regex: /.{8,}/ },
  { id: 'upper', label: "One uppercase letter", regex: /[A-Z]/ },
  { id: 'number', label: "One number", regex: /[0-9]/ },
  { id: 'special', label: "One special character (e.g. !@#$)", regex: /[^A-Za-z0-9]/ },
];

export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// --- 2. Register Schema ---
// (Removed confirmPassword as requested)
export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: passwordSchema, 
});

// --- 3. Login Schema ---
export const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

// --- 4. Forgot Password / Resend OTP Schema ---
export const ResetPasswordFormSchema = z.object({
  email: z.string().email("Invalid email"),
});

// --- 5. Verify OTP Schema ---
export const VerifyOtpSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().min(1, "OTP is required"),
});

// --- 6. Complete Password Reset Schema ---
// (Used when user submits the new password with OTP)
export const NewPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
  otp: z.string().min(1, "OTP is required"),
  newPassword: passwordSchema, // Enforce strong password here
});

// --- 7. Accept Invite Schema ---
export const AcceptInviteSchema = z.object({
  token: z.string().min(1, "Invite token is required"),
  password: passwordSchema, // Enforce strong password here
});

// --- 8. Refresh Token Schema ---
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// Export Types (Optional, good for Frontend/Backend shared types)
export type RegisterFormData = z.infer<typeof RegisterSchema>;
export type LoginFormData = z.infer<typeof LoginSchema>;
export type ResetPasswordFormData = z.infer<typeof ResetPasswordFormSchema>;