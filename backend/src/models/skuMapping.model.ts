import { Schema, model, Document, Types } from 'mongoose';

interface MappedProduct {
  inventoryItem: Types.ObjectId;
  quantity: number;
}

export interface ISkuMapping extends Document {
  gstin: string;
  sku: string;
  manufacturingPrice: number;
  packagingCost: number;
  mappedProducts: MappedProduct[];
}

const SkuMappingSchema = new Schema<ISkuMapping>({
  gstin: { type: String, required: true },
  sku: { type: String, required: true },
  manufacturingPrice: { type: Number, default: 0 },
  packagingCost: { type: Number, default: 0 },
  mappedProducts: [{
    inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, required: true, default: 1 },
  }],
}, { 
  timestamps: true,
});

SkuMappingSchema.index({ gstin: 1, sku: 1 }, { unique: true });

export const SkuMapping = model<ISkuMapping>('SkuMapping', SkuMappingSchema);