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
  password?: string; // Optional for invited users
  phone?: string;    
  gstin?: string;    

  // --- Role & Permissions ---
  role: Role;
  permissions: {
    cropper: boolean;
    inventory: boolean;
    payments: boolean;
    returns: boolean;
    admin: boolean;
  };

  // --- GST Access Scope ---
  allowedGSTs: string[];
  gstinvalue: string[]; 
  gstAccessAll: boolean;

  // --- Invite Flow ---
  status: 'active' | 'invited' | 'revoked';
  inviteToken?: string;
  inviteTokenExpire?: Date;

  // google oauth
  authProvider: 'email' | 'google';
  googleId?: string;

  otp?: string;
  otpExpire?: Date;
  isVerified: boolean;

  // Methods
  comparePassword(password: string): Promise<boolean>;
}

// 2. Define the Schema
const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: false },

    //google oauth
    authProvider: {
      type: String,
      enum: ['email', 'google'],
      default: 'email'
    },
    googleId: { type: String, select: false },
    
    // --- UPDATED PASSWORD FIELD ---
    password: { 
      type: String, 
      required: false,
      select: false,
    },

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
    allowedGSTs: [{ type: String }], 
    gstinvalue: [{ type: String }],
    gstAccessAll: { type: Boolean, default: true },

    // --- Invite Flow ---
    status: {
      type: String,
      enum: ['active', 'invited', 'revoked'],
      default: 'active',
    },
    inviteToken: { type: String, select: false },
    inviteTokenExpire: { type: Date, select: false },
    otp: { type: String, select: false },
    otpExpire: { type: Date, select: false },
     isVerified: { type: Boolean, default: false },
  
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
    // FIX: Increased Salt Rounds to 12 (OWASP Recommendation)
    const salt = await bcrypt.genSalt(process.env.BCRYPT_SALT_ROUNDS ? parseInt(process.env.BCRYPT_SALT_ROUNDS) : 12);
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
export const User = models.User || model<IUser>('User', UserSchema);