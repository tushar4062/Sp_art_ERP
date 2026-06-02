import mongoose from 'mongoose';

export type PaymentAuditAction = 'created' | 'verified' | 'rejected' | 'access_granted';

export interface PaymentAuditLogDocument extends mongoose.Document {
  paymentId: mongoose.Types.ObjectId;
  action: PaymentAuditAction;
  performedByAdminId?: mongoose.Types.ObjectId;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  reasonNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentAuditLogSchema = new mongoose.Schema<PaymentAuditLogDocument>(
  {
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'OfflinePayment', required: true, index: true },
    action: {
      type: String,
      enum: ['created', 'verified', 'rejected', 'access_granted'],
      required: true,
      index: true,
    },
    performedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    previousValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    reasonNotes: { type: String },
  },
  {
    timestamps: true,
    collection: 'paymentauditlogs',
  },
);

PaymentAuditLogSchema.index({ paymentId: 1 });
PaymentAuditLogSchema.index({ createdAt: 1 });

const PaymentAuditLogModel =
  (mongoose.models.PaymentAuditLog as mongoose.Model<PaymentAuditLogDocument> | undefined) ??
  mongoose.model<PaymentAuditLogDocument>('PaymentAuditLog', PaymentAuditLogSchema);

export default PaymentAuditLogModel;
