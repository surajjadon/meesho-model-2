import { Schema, model, models, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  subscription: Types.ObjectId;
  amount: number;
  currency: string;
  provider: 'razorpay' | 'stripe' | 'manual';
  transactionId: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  paymentDate: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    subscription: { 
      type: Schema.Types.ObjectId, 
      ref: 'UserSubscription', 
      required: true,
      index: true 
    },
    amount: { 
      type: Number, 
      required: true 
    },
    currency: { 
      type: String, 
      required: true,
      default: 'INR' 
    },
    provider: { 
      type: String, 
      enum: ['razorpay', 'stripe', 'manual'], 
      required: true 
    },
    transactionId: { 
      type: String, 
      required: true,
      unique: true 
    },
    status: { 
      type: String, 
      enum: ['pending', 'success', 'failed', 'refunded'], 
      default: 'pending',
      index: true 
    },
    paymentDate: { 
      type: Date, 
      default: Date.now 
    }
  },
  { 
    timestamps: true 
  }
);

export const Payment = models.Payment || model<IPayment>('Payment', PaymentSchema);