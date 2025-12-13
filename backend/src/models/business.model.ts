import { Schema, model, Document, Types } from 'mongoose';

export interface IBusiness extends Document {
  userId: Types.ObjectId;
  gstin: string;
  accountName: string;
  brandName: string;
}

const BusinessSchema = new Schema<IBusiness>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  gstin: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true 
  },
  accountName: { type: String, required: true, trim: true },
  brandName: { type: String, required: true, trim: true },
}, { timestamps: true });

export const Business = model<IBusiness>('Business', BusinessSchema);