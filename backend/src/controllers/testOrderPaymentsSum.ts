import { Request, Response } from "express";
import * as XLSX from "xlsx";

function cleanNumber(v: any): number {
  if (!v) return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[₹,]/g, "").trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export const testOrderPaymentsSum = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Upload a file" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

    // Find sheet that contains “Order Payments”
    const sheetName = workbook.SheetNames.find(n =>
      n.toLowerCase().includes("order")
    );

    if (!sheetName) {
      return res.status(400).json({
        message: "Could not find Order Payments sheet",
      });
    }

    const sheet = workbook.Sheets[sheetName];

    // Convert whole sheet to array (slightly heavy but reliable)
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // STEP 1: Find header row in first 50 rows
    let headerRowIndex = -1;
    let finalSettlementColIndex = -1;

    for (let i = 0; i < 50 && i < rows.length; i++) {
      const row = rows[i].map((c: any) =>
        typeof c === "string" ? c.toLowerCase().trim() : c
      );

      const possibleNames = [
        "final settlement amount",
        "final settlement",
        "settlement amount",
        "final payout",
        "final settlement amount (inr)"
      ];

      possibleNames.forEach(name => {
        const idx = row.indexOf(name);
        if (idx !== -1) {
          headerRowIndex = i;
          finalSettlementColIndex = idx;
        }
      });

      if (headerRowIndex !== -1) break;
    }

    if (finalSettlementColIndex === -1) {
      return res.status(400).json({
        message: "Could not detect 'Final Settlement Amount' column",
      });
    }

    // STEP 2: Sum all values below the header row
    let total = 0;
    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const value = cleanNumber(rows[r][finalSettlementColIndex]);
      total += value;
    }

    res.json({
      success: true,
      file: req.file.originalname,
      headerRowIndex,
      finalSettlementColIndex,
      totalFinalSettlement: total,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      message: "Error processing file",
      error: err.message,
    });
  }
};
