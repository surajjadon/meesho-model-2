import { z } from "zod";
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

// --- 3. Register Schema ---
export const RegisterFormSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    password: passwordSchema, 
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof RegisterFormSchema>;