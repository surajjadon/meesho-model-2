import { Schema, model, models, Document, Types } from 'mongoose';

export interface IUserSubscription extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  plan: Types.ObjectId;
  pricing: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'cancelled' | 'expired';
  autoRenewal: boolean;
}

const UserSubscriptionSchema = new Schema<IUserSubscription>(
  {
    user: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    plan: { 
      type: Schema.Types.ObjectId, 
      ref: 'SubscriptionPlan', 
      required: true 
    },
    pricing: { 
      type: Schema.Types.ObjectId, 
      ref: 'PlanPricing', 
      required: true 
    },
    startDate: { 
      type: Date, 
      required: true,
      default: Date.now 
    },
    endDate: { 
      type: Date, 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['active', 'cancelled', 'expired'], 
      default: 'active',
      index: true 
    },
    autoRenewal: { 
      type: Boolean, 
      default: true 
    }
  },
  { 
    timestamps: true 
  }
);

export const UserSubscription = models.UserSubscription || model<IUserSubscription>('UserSubscription', UserSubscriptionSchema);