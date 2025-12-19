import { Schema, model, Document, Types } from 'mongoose';

// Interface for the History Document
export interface ISkuMappingHistory extends Document {
  skuMappingId: Types.ObjectId; // Reference to the parent mapping
  gstin: string;
  sku: string;
  manufacturingPrice: number;
  packagingCost: number;
updatedAt: Date;
}

// Schema for History
const SkuMappingHistorySchema = new Schema<ISkuMappingHistory>({
  skuMappingId: { type: Schema.Types.ObjectId, ref: 'SkuMapping', required: true },
  gstin: { type: String, required: true },
  sku: { type: String, required: true },
  manufacturingPrice: { type: Number, required: true },
  packagingCost: { type: Number, required: true },
updatedAt: { type: Date, default: Date.now }
});

// Export ONLY the History model
export const SkuMappingHistory = model<ISkuMappingHistory>('SkuMappingHistory', SkuMappingHistorySchema);