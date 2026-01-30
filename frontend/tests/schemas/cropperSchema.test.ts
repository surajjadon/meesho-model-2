import { CropperUploadSchema } from "./../../app/Schema/cropper.Schema";
describe("CropperUploadSchema", () => {

  test("allows valid PDF and GSTIN", () => {
    const file = new File(["data"], "label.pdf", {
      type: "application/pdf",
    });

    const result = CropperUploadSchema.safeParse({
      pdfFile: file,
      gstin: "22AAAAA0000A1Z5",
    });

    expect(result.success).toBe(true);
  });

  test("rejects non-PDF files", () => {
    const file = new File(["data"], "label.txt", {
      type: "text/plain",
    });

    const result = CropperUploadSchema.safeParse({
      pdfFile: file,
      gstin: "22AAAAA0000A1Z5",
    });

    expect(result.success).toBe(false);
  });

  test("rejects invalid GSTIN", () => {
    const file = new File(["data"], "label.pdf", {
      type: "application/pdf",
    });

    const result = CropperUploadSchema.safeParse({
      pdfFile: file,
      gstin: "INVALID",
    });

    expect(result.success).toBe(false);
  });

});

