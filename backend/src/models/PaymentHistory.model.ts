import mongoose, { Schema, Document } from "mongoose";

export interface IPaymentHistory extends Document {
  businessGstin: string;
  fileName: string;
  startDate: Date;
  endDate: Date;
  totalNetOrderAmount: number;
  totalAdsCost: number;
  totalReferralEarnings: number;
  totalCompensation: number;
  totalRecoveries: number;
  paymentsCount: number;
  dayWisePayments: { date: string; amount: number }[];
  rawOrderPayments: any[];
  rawAds: any[];
  rawReferral: any[];
  rawCompRecovery: any[];
  uploadedAt: Date;
}

const PaymentHistorySchema = new Schema<IPaymentHistory>({
  businessGstin: { type: String, required: true, index: true },
  fileName: String,
  
  startDate: { type: Date },
  endDate: { type: Date },

  totalNetOrderAmount: { type: Number, default: 0 },
  totalAdsCost: { type: Number, default: 0 },
  totalReferralEarnings: { type: Number, default: 0 },
  totalCompensation: { type: Number, default: 0 },
  totalRecoveries: { type: Number, default: 0 },
  paymentsCount: { type: Number, default: 0 },

  dayWisePayments: [{
      _id: false,
      date: String,
      amount: Number,
  }],

  // ✅ FIXED: Simplified and correct way to define an array of mixed types
  rawOrderPayments: { type: [], default: [] },
  rawAds: { type: [], default: [] },
  rawReferral: { type: [], default: [] },
  rawCompRecovery: { type: [], default: [] },

}, { timestamps: { createdAt: 'uploadedAt' } });

const PaymentHistory = mongoose.model<IPaymentHistory>("PaymentHistory", PaymentHistorySchema);

export default PaymentHistory;