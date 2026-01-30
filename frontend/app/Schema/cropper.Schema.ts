import { z } from "zod";
export const CropperUploadSchema = z.object({
  gstin: z
    .string()
    .length(15, "GSTIN must be exactly 15 characters"),

  pdfFile: z
    .instanceof(File, { message: "PDF file is required" })
    .refine(
      (file) => file.type === "application/pdf",
      "Only PDF files are allowed"
    )
    .refine(
      (file) => file.size <= 500 * 1024 * 1024,
      "PDF size must be less than 500MB"
    ),
});

export type CropperUploadInput = z.infer<typeof CropperUploadSchema>;
