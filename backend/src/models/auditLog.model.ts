import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  userId: Types.ObjectId;
  userName: string;
  action: string;
  resource: string;
  details: string;
  businessGstin: string; // 👈 CRITICAL: Links log to a specific business
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true, uppercase: true },
  resource: { type: String, required: true },
  details: { type: String, required: true },
  businessGstin: { type: String, required: true, index: true }, // Index for fast filtering
}, { timestamps: { createdAt: true, updatedAt: false } });

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);