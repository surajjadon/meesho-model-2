// schemas/product-mapping.schema.ts
import { z } from "zod";

/**
 * Accepts:
 * - Date object (date picker)
 * - ISO string (API)
 */
const dateSchema = z.preprocess(
  (val) => {
    if (typeof val === "string" || val instanceof Date) {
      return new Date(val);
    }
    return val;
  },
 z.date({
  message: "Date is required",
})
);

export const ProductMappingSchema = z
  .object({
    salesSku: z
      .string()
      .trim()
      .min(1, "Sales SKU is required")
      .max(100, "Sales SKU is too long"),

    inventoryProductIds: z
      .array(z.string().min(1))
      .min(1, "Select at least one inventory product"),

    manufacturingPrice: z
      .number()
      .min(0, "Manufacturing price cannot be negative"),

    packagingCost: z
      .number()
      .min(0, "Packaging cost cannot be negative")
      .default(0),

    validFrom: dateSchema,
  })

export type ProductMappingFormData = z.infer<typeof ProductMappingSchema>;
