import mongoose, { Schema, Document } from 'mongoose';

export interface IProcessingHistory extends Document {
  businessGstin: string;
  fileName: string;
  processedAt: Date;
  stats: {
    saved: number;
    skipped: number;
    totalProcessed: number;
    unmappedCount: number;
    inventoryDeducted: number; // ✅ NEW FIELD
  };
}

const ProcessingHistorySchema = new Schema<IProcessingHistory>({
  businessGstin: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  processedAt: { type: Date, default: Date.now },
  stats: {
    saved: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    totalProcessed: { type: Number, default: 0 },
    unmappedCount: { type: Number, default: 0 },
    inventoryDeducted: { type: Number, default: 0 } // ✅ NEW
  }
});

export default mongoose.model<IProcessingHistory>('ProcessingHistory', ProcessingHistorySchema);