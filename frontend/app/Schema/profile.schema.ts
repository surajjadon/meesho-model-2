// schemas/account.schema.ts
import { z } from "zod";
import { isValidGSTIN } from "./../../lib/gstin";
export const AccountSchema = z.object({
  accountName: z
    .string()
    .min(2, "Account name must be at least 2 characters")
    .max(100, "Account name is too long"),

  brandName: z
    .string()
    .min(2, "Brand name must be at least 2 characters")
    .max(100, "Brand name is too long"),

  gstin: z
    .string()
    .length(15, "GSTIN must be exactly 15 characters")
    .refine(isValidGSTIN, { message: "Invalid GSTIN" })
});

export type AccountFormData = z.infer<typeof AccountSchema>;
