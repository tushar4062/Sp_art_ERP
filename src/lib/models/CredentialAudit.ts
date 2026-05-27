import mongoose, { Schema, Document } from 'mongoose';

export interface CredentialAuditDocument extends Document {
  credentialId: mongoose.Types.ObjectId;
  targetEmail: string;
  changes: Record<string, unknown>;
  performedBy?: string;
  performedAt: Date;
  notification?: {
    to: string;
    sent: boolean;
    error?: string;
  };
}

const CredentialAuditSchema = new Schema<CredentialAuditDocument>({
  credentialId: { type: Schema.Types.ObjectId, required: true, ref: 'Credentials' },
  targetEmail: { type: String, required: true },
  changes: { type: Schema.Types.Mixed, required: true },
  performedBy: { type: String },
  performedAt: { type: Date, default: () => new Date() },
  notification: {
    to: { type: String },
    sent: { type: Boolean },
    error: { type: String },
  },
});

export default mongoose.models.CredentialAudit || mongoose.model<CredentialAuditDocument>('CredentialAudit', CredentialAuditSchema);
