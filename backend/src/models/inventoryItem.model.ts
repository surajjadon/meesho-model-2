import { Schema, model, Document } from 'mongoose';

export interface IInventoryItem extends Document {
  gstin: string;
  title: string;
  category?: string;
  description?: string;
  price?: number;
  stock?: number;
  gst?: string;
  inventoryId?: string;
  inventoryName?: string;
  variation?: string;
  hsnCode?: string;
  netWeight?: string;
  netQuantity?: string;
  manufacturer?: string;
  featuredImage?: string; // We will store a URL to the image
}

const InventoryItemSchema = new Schema<IInventoryItem>({
  gstin: { type: String, required: true, index: true },
  title: { type: String, required: true },
  category: { type: String },
  description: { type: String },
  price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  gst: { type: String },
  inventoryId: { type: String },
  inventoryName: { type: String },
  variation: { type: String },
  hsnCode: { type: String },
  netWeight: { type: String },
  netQuantity: { type: String },
  manufacturer: { type: String },
  featuredImage: { type: String },
}, { timestamps: true });

export const InventoryItem = model<IInventoryItem>('InventoryItem', InventoryItemSchema);