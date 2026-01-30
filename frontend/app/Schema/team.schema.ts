// schemas/team.schema.ts
import { z } from "zod";
import { isValidGSTIN } from "./../../lib/gstin";
const indianPhoneRegex = /^[6-9]\d{9}$/;
export const TeamInviteSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters"),

    phone: z
      .string()
      .regex(indianPhoneRegex, "Enter a valid Indian mobile number"),

    email: z
      .string()
      .email("Enter a valid email address"),

    role: z.enum([
      "ADMIN",
      "MANAGER",
      "ACCOUNTANT",
      "OPERATOR",
      "CUSTOM",
    ]),

    customRoleName: z
      .string()
      .min(1, "Custom role name must be at least 1 characters")
      .optional(),

    // ✅ Change permissions from array -> object
    permissions: z.object({
      cropper: z.boolean(),
      inventory: z.boolean(),
      payments: z.boolean(),
      returns: z.boolean(),
      admin: z.boolean(),
    }),

    gstAccess: z
      .array(
        z
          .string()
          .length(15, "GSTIN must be 15 characters")
          .refine(isValidGSTIN, { message: "Invalid GSTIN" })
      )
      .min(1, "Select at least one GST access"),
  })
  .refine(
    (data) =>
      data.role !== "CUSTOM" ||
      (data.customRoleName && data.customRoleName.trim().length > 0),
    {
      message: "Custom role name is required when role is CUSTOM",
      path: ["customRoleName"],
    }
  );


export type TeamInviteFormData = z.infer<typeof TeamInviteSchema>;
