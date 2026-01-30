import { Schema, model, Document, Types } from 'mongoose';

export interface IStockHistory extends Document {
  gstin: string;
  inventoryItem: Types.ObjectId; // Reference to the inventory item
  change: number; // e.g., -5, +50
  previousStock: number;
  newStock: number;
  reason: 'Manual Update' | 'Order Fulfillment' | 'Initial Stock';
  notes?: string;
  availableStock:number;
  costPrice?: number;
  batchid:string | number; // e.g., "Order ID: ORD-12345"
}

const StockHistorySchema = new Schema<IStockHistory>({
  gstin: { type: String, required: true, index: true },
  inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
  change: { type: Number, required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reason: { type: String, required: true },
  availableStock:{type:Number,required:false},
  notes: { type: String },
   batchid: { type: Schema.Types.Mixed, required: false },
  costPrice: { type: Number, default: 0 },
}, { timestamps: true });

StockHistorySchema.index(
  { gstin: 1, inventoryItem: 1, batchid: 1 },
  { unique: true }
);

export const StockHistory = model<IStockHistory>('StockHistory', StockHistorySchema);