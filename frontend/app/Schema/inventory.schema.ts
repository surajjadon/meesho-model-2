// schemas/inventory-item.schema.ts
import { z } from "zod";

/**
 * Image validation (optional)
 * Accepts File from input[type="file"]
 */
const imageSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 5 * 1024 * 1024, {
    message: "Image size must be less than 5MB",
  })
  .refine(
    (file) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.type),
    {
      message: "Only JPG, PNG, or WEBP images are allowed",
    }
  )
  .optional();

export const InventoryItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(100, "Title is too long"),

  category: z
    .string()
    .trim()
    .max(50, "Category is too long")
    .optional(),

  price: z
    .number()
    .min(0, "Price cannot be negative")
    .optional(),

  stock: z
    .number()
    .int("Stock must be an integer")
    .min(0, "Stock cannot be negative")
    .optional(),

  batchId: z
    .string()
    .trim()
    .min(1, "Batch ID is required")
    .max(50, "Batch ID is too long"),

  hsnOrSku: z
    .string()
    .trim()
    .max(20, "HSN / SKU is too long")
    .optional(),

  variation: z
    .string()
    .trim()
    .max(50, "Variation is too long")
    .optional(),

  image: imageSchema,
});

export type InventoryItemFormData = z.infer<typeof InventoryItemSchema>;
