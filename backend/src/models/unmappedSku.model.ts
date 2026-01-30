import { Schema, model, Document } from 'mongoose';

export interface IUnmappedSku extends Document {
  gstin: string;
  sku: string;
  orderId: string;
  status: 'pending' | 'mapped';
}

const UnmappedSkuSchema = new Schema<IUnmappedSku>(
  {
    gstin: { type: String, required: true, index: true },
    sku: { type: String, required: true },
    orderId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'mapped'], default: 'pending' },
  },
  { timestamps: true }
);

// ✅ Index to prevent duplicate entries for same order/sku combination
UnmappedSkuSchema.index({ gstin: 1, sku: 1, orderId: 1 }, { unique: true });

export const UnmappedSku = model<IUnmappedSku>('UnmappedSku', UnmappedSkuSchema);