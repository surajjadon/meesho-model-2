import mongoose, { Schema, Document } from 'mongoose';

export interface IReturnOrder extends Document {
  businessGstin: string;
  subOrderNo: string;
  awbNumber?: string;
  orderDate: Date;
  dispatchDate?: Date;
  paymentDate?: Date;
  productName: string;
  supplierSku: string;
  liveOrderStatus: string; // Original status from excel (RTO, Return, Delivered)
  
  // ✅ NEW: Type of return (derived from liveOrderStatus)
  returnType: 'RTO' | 'CustomerReturn';
  
  // ✅ NEW: Whether item has been physically received (updated by scanner)
  receivedStatus: 'Pending' | 'Received';
  
  // Verification status (what user marks it as)
   verificationStatus: "None" | "Delivered" | "Cancelled" | "Return" | "RTO" | "Undelivered" | "Damaged";
  
  verifiedAt?: Date;
  receivedAt?: Date; // ✅ NEW: When item was scanned/received
  notes?: string;
}

const ReturnOrderSchema = new Schema<IReturnOrder>({
  businessGstin: { type: String, required: true, index: true },
  subOrderNo: { type: String, required: true },
  awbNumber: { type: String, index: true },
  orderDate: { type: Date },
  dispatchDate: { type: Date },
  paymentDate: { type: Date },
  productName: { type: String },
  supplierSku: { type: String },
  liveOrderStatus: { type: String },
  
  // ✅ NEW FIELDS
  returnType: {
    type: String,
    enum: ['RTO', 'CustomerReturn'],
    default: 'RTO',
    index: true,
  },
  
  receivedStatus: {
    type: String,
    enum: ['Pending', 'Received'],
    default: 'Pending',
    index: true,
  },
  
  verificationStatus: {
    type: String,
    enum: ['None', 'Delivered', 'Cancelled', 'Return', 'RTO', 'Undelivered', 'Damaged'],
    default: 'None',
    index: true,
  },
  
  verifiedAt: { type: Date },
  receivedAt: { type: Date }, // ✅ NEW
  notes: { type: String },
}, { timestamps: true });

ReturnOrderSchema.index({ businessGstin: 1, subOrderNo: 1 }, { unique: true });
ReturnOrderSchema.index({ businessGstin: 1, returnType: 1, receivedStatus: 1 });

const ReturnOrder = mongoose.model<IReturnOrder>('ReturnOrder', ReturnOrderSchema);

export default ReturnOrder;