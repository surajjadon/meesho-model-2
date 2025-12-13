import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

// --- THE FIX IS HERE ---
// We add 'gstin' as an optional property to the IUser interface.
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password?: string;
  name: string;
  gstin?: string; // <-- ADD THIS LINE
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: true },
    // And we add the corresponding field to the schema itself.
    gstin: { // <-- ADD THIS FIELD
      type: String,
      required: false, // It's not required for every user account.
    },
  },
  { timestamps: true }
);

// Hash password before saving (Your existing code, unchanged)
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords (Your existing code, unchanged)
UserSchema.methods.comparePassword = function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.password!);
};

export const User = model<IUser>('User', UserSchema);