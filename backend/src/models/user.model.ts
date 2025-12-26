import { Schema, model, Document, Types, models } from 'mongoose';
import bcrypt from 'bcryptjs';

// 1. Define the Interface

type BaseRole =
  | 'Owner'
  | 'Admin'
  | 'Manager'
  | 'Accountant'
  | 'Operator';

export type Role = BaseRole | (string & {});
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string; // Optional now, because invited users won't have one initially
  phone?: string;    // Added phone number
  gstin?: string;    // Kept your original field (likely for the Owner's main GST)

  // --- NEW: Role & Permissions ---
   role: Role;
  
  permissions: {
    cropper: boolean;
    inventory: boolean;
    payments: boolean;
    returns: boolean;
    admin: boolean;
  };

  // --- NEW: GST Access Scope ---
  // If 'gstAccessAll' is true, they see everything.
  // If false, they only see GSTs listed in 'allowedGSTs'.
  allowedGSTs: string[];
  gstinvalue:string[]; 
  gstAccessAll: boolean;

  // --- NEW: Invite Flow ---
  status: 'active' | 'invited' | 'revoked';
  inviteToken?: string;
  inviteTokenExpire?: Date;

  // Methods
  comparePassword(password: string): Promise<boolean>;
}

// 2. Define the Schema
const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: false }, // Optional for now
    
    // Password is NOT required initially (for invited users)
    password: { type: String, required: false, select: false },

    // Your original field
    gstin: { type: String, required: false },

    // --- Role & Permissions ---
role: {
  type: String,
  required: true,
  trim: true,
  default: 'Owner'
},
    
    permissions: {
      cropper: { type: Boolean, default: false },
      inventory: { type: Boolean, default: false },
      payments: { type: Boolean, default: false },
      returns: { type: Boolean, default: false },
      admin: { type: Boolean, default: false },
    },

    // --- GST Access Scope ---
    // Storing Profile IDs as strings is often easier for simple checks
    allowedGSTs: [{ type: String }], 
    gstinvalue:[{type:String}],
    gstAccessAll: { type: Boolean, default: true }, // Owners usually see all

    // --- Invite Flow ---
    status: {
      type: String,
      enum: ['active', 'invited', 'revoked'],
      default: 'active',
    },
    inviteToken: { type: String, select: false }, // Hide token from queries by default
    inviteTokenExpire: { type: Date, select: false },
  },
  { timestamps: true }
);

// 3. Pre-save Hook (Hash Password)
UserSchema.pre('save', async function (next) {
  // Only hash the password if it exists and has been modified
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// 4. Compare Password Method
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

// 5. Export Model
// check 'models.User' first to prevent overwrite errors in Next.js development
export const User = models.User || model<IUser>('User', UserSchema);