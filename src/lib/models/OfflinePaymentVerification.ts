import mongoose from 'mongoose';

export type OfflinePaymentVerificationStatus = 'pending' | 'verified' | 'rejected';

export interface OfflinePaymentVerificationDocument extends mongoose.Document {
  paymentId: mongoose.Types.ObjectId;
  verificationStatus: OfflinePaymentVerificationStatus;
  verifiedByAdminId?: mongoose.Types.ObjectId;
  evidenceFilePath?: string;
  verificationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
}

const OfflinePaymentVerificationSchema = new mongoose.Schema<OfflinePaymentVerificationDocument>(
  {
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'OfflinePayment', required: true, index: true },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      required: true,
      index: true,
    },
    verifiedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    evidenceFilePath: { type: String },
    verificationNotes: { type: String },
    verifiedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'offlinepaymentverifications',
  },
);

OfflinePaymentVerificationSchema.index({ paymentId: 1 });
OfflinePaymentVerificationSchema.index({ verificationStatus: 1 });

const OfflinePaymentVerificationModel =
  (mongoose.models.OfflinePaymentVerification as mongoose.Model<OfflinePaymentVerificationDocument> | undefined) ??
  mongoose.model<OfflinePaymentVerificationDocument>(
    'OfflinePaymentVerification',
    OfflinePaymentVerificationSchema,
  );

export default OfflinePaymentVerificationModel;
