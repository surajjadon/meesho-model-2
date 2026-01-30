import { z } from "zod";

export const ResetPasswordFormSchema = z.object({
  email: z.string().email("Invalid email"),
});

export type ResetPasswordFormData = z.infer<typeof ResetPasswordFormSchema>;