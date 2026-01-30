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
    inventoryDeducted: number;
  };
  dailyBreakdown: Array<{
    date: string;
    totalOrders: number;
    partners: Record<string, number>; 
  }>;
}

const ProcessingHistorySchema: Schema = new Schema({
  businessGstin: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  processedAt: { type: Date, default: Date.now },
  stats: {
    saved: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    totalProcessed: { type: Number, default: 0 },
    unmappedCount: { type: Number, default: 0 },
    inventoryDeducted: { type: Number, default: 0 }
  },
  dailyBreakdown: [{
    date: String,
    totalOrders: Number,
    partners: { type: Map, of: Number } 
  }]
});

export default mongoose.model<IProcessingHistory>('ProcessingHistory', ProcessingHistorySchema);