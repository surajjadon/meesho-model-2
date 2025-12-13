import { Schema, model, Document } from 'mongoose';

export interface ILabelData extends Document {
  businessGstin: string;
  orderNo: string;           // The order number from the shipping label
  awbNumber: string;         // The AWB/Tracking number from the label
  sku?: string;
  deliveryPartner?: string;
  isMapped: boolean;         // Flag to track if it's been matched with Excel data
  createdAt: Date;
  updatedAt: Date;
}

const LabelDataSchema = new Schema<ILabelData>(
  {
    businessGstin: { 
      type: String, 
      required: true, 
      index: true 
    },
    orderNo: { 
      type: String, 
      required: true, 
      index: true 
    },
    awbNumber: { 
      type: String, 
      required: true 
    },
    sku: { 
      type: String 
    },
    deliveryPartner: { 
      type: String 
    },
    isMapped: { 
      type: Boolean, 
      default: false 
    },
  },
  { timestamps: true }
);

// Compound index for efficient lookups
LabelDataSchema.index({ businessGstin: 1, orderNo: 1 }, { unique: true });
LabelDataSchema.index({ businessGstin: 1, awbNumber: 1 });

const LabelData = model<ILabelData>('LabelData', LabelDataSchema);

export default LabelData;