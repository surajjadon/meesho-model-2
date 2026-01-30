import { Schema, model, models, Document,Types } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  name: string;
  type: 'basic' | 'standard' | 'pro';
  features: string[];
  isPopular: boolean;
  badge?: string;
  price: Types.ObjectId;
  trialDays: number;
  isActive: boolean;
  displayOrder: number;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['basic', 'standard', 'pro'],
      required: true,
      unique: true
    },
    price:{
    type: Schema.Types.ObjectId, 
    ref: 'PlanPricing',
    required: true,
    index: true
    },
    features: { type: [String], default: [] },
    isPopular: { type: Boolean, default: false },
    badge: { type: String },
    trialDays: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const SubscriptionPlan =
  models.SubscriptionPlan || model('SubscriptionPlan', SubscriptionPlanSchema);
