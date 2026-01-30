import { Schema, model, Document, Types } from 'mongoose';

export interface IsPriceHitory extends Document {
  gstin: string;
  inventoryItem: Types.ObjectId; // Reference to the inventory item
  change: number; // e.g., -5, +50
  previousPrice: number;
  newPrice: number;
  reason: 'Manual Update' | 'Order Fulfillment' | 'Initial Price';
  notes?: string;
}

const  PriceHistorySchema = new Schema<IsPriceHitory>({
  gstin: { type: String, required: true, index: true },
  inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
  // sku:{type:String},
  change: { type: Number, required: true },
  previousPrice: { type: Number, required: true },
  newPrice: { type: Number, required: true },
  reason: { type: String, required: true },
  notes: { type: String },

}, { timestamps: true });

export const PriceHistory = model<IsPriceHitory>('PriceHistory', PriceHistorySchema);