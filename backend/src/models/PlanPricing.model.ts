import { Schema, model, models, Document, Types } from 'mongoose';

export interface IPlanPricing extends Document {
  plan: Types.ObjectId;
  cycle: 'monthly' | 'yearly' | '2years' | '4years';
  price: number;
  billingType: 'recurring' | 'onetime';
  supportsInstallments: boolean;
}

const PlanPricingSchema = new Schema<IPlanPricing>(
  {
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
      index: true
    },
    cycle: {
      type: String,
      enum: ['monthly', 'yearly', '2years', '4years'],
      required: true
    },
    price: { type: Number, required: true },
    billingType: {
      type: String,
      enum: ['recurring', 'onetime'],
      required: true
    },
    supportsInstallments: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const PlanPricing =
  models.PlanPricing || model('PlanPricing', PlanPricingSchema);
