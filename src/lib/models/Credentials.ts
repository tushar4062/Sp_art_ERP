import mongoose from 'mongoose';

export type CredentialRole = 'student' | 'teacher' | 'senior_teacher';
export type CredentialAccountStatus = 'Active' | 'Inactive';

export interface CredentialDocument extends mongoose.Document {
  name: string;
  username: string;
  email: string;
  password?: string;
  passwordHash: string;
  role: CredentialRole;
  accountStatus: CredentialAccountStatus;
  mobileNumber?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CredentialSchema = new mongoose.Schema<CredentialDocument>(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'teacher', 'senior_teacher'], default: 'student' },
    accountStatus: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    mobileNumber: { type: String },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

const CredentialModel =
  (mongoose.models.Credential as mongoose.Model<CredentialDocument> | undefined) ??
  mongoose.model<CredentialDocument>("Credential", CredentialSchema);

export default CredentialModel;
