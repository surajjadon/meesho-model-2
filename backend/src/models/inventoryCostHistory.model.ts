import { Schema, model, Document } from "mongoose";

export interface IInventoryCostHistory extends Document {
  gstin: string;
  sku: string;                 // Must match Supplier SKU after mapping
  costPrice: number;           // CP per unit
  effectiveFrom: Date;         // Date from which this cost applies
  notes?: string;
}

const InventoryCostHistorySchema = new Schema(
  {
    gstin: { type: String, required: true, index: true },
    sku: { type: String, required: true, index: true },
    costPrice: { type: Number, required: true },
    effectiveFrom: { type: Date, required: true, index: true },
    notes: { type: String },
  },
  { timestamps: true }
);

export const InventoryCostHistory = model<IInventoryCostHistory>(
  "InventoryCostHistory",
  InventoryCostHistorySchema
);
