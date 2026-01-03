import { Schema, model, Document, Types } from 'mongoose';

export interface IStockHistory extends Document {
  gstin: string;
  inventoryItem: Types.ObjectId; // Reference to the inventory item
  change: number; // e.g., -5, +50
  previousStock: number;
  newStock: number;
  reason: 'Manual Update' | 'Order Fulfillment' | 'Initial Stock';
  notes?: string;
  costPrice?: number; // e.g., "Order ID: ORD-12345"
}

const StockHistorySchema = new Schema<IStockHistory>({
  gstin: { type: String, required: true, index: true },
  inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
  // sku:{type:String},
  change: { type: Number, required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reason: { type: String, required: true },
  notes: { type: String },
  costPrice: { type: Number, default: 0 },
}, { timestamps: true });

export const StockHistory = model<IStockHistory>('StockHistory', StockHistorySchema);