import { Schema, model, Document, Types } from 'mongoose';

// Interface for the History Document

interface MappedProduct {
  inventoryItem: Types.ObjectId;
  quantity: number;
}
export interface ISkuMappingHistory extends Document {
  skuMappingId: Types.ObjectId; // Reference to the parent mapping
  gstin: string;
  sku: string;
  manufacturingPrice: number;
    mappedProducts: MappedProduct[];
  packagingCost: number;
   validFrom:Date,
  validTill:Date,
updatedAt: Date;
}

// Schema for History
const SkuMappingHistorySchema = new Schema<ISkuMappingHistory>({
  skuMappingId: { type: Schema.Types.ObjectId, ref: 'SkuMapping', required: true },
  gstin: { type: String, required: true },
  sku: { type: String, required: true },
manufacturingPrice: { type: Number, required: true },
  packagingCost: { type: Number, required: true },
  mappedProducts: [{
    inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
    quantity: { type: Number, required: true }
  }],
   validFrom:{type:Date,required:true},
  validTill:{type:Date,required:true},
updatedAt: { type: Date, default: Date.now }
});

// Export ONLY the History model
export const SkuMappingHistory = model<ISkuMappingHistory>('SkuMappingHistory', SkuMappingHistorySchema);