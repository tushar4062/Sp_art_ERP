import mongoose from 'mongoose';

export type OfflinePaymentStatus = 'pending' | 'completed' | 'failed' | 'rejected';
export type OfflinePaymentMethod = 'online' | 'offline';
export type OfflinePaymentChannel = 'cash' | 'cheque' | 'bank_transfer' | 'upi';

export interface OfflinePaymentDocument extends mongoose.Document {
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: OfflinePaymentMethod;
  offlineMethod: OfflinePaymentChannel;
  paymentStatus: OfflinePaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  offlinePaymentReference?: string;
  offlinePaymentDate?: Date;
  expectedPaymentDate?: Date;
  paymentReceivedByAdminId?: mongoose.Types.ObjectId;
  notes?: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const OfflinePaymentSchema = new mongoose.Schema<OfflinePaymentDocument>(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['online', 'offline'], required: true, default: 'offline' },
    offlineMethod: { type: String, enum: ['cash', 'cheque', 'bank_transfer', 'upi'], required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'rejected'],
      required: true,
      default: 'pending',
      index: true,
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    offlinePaymentReference: { type: String, unique: true, sparse: true, index: true },
    offlinePaymentDate: { type: Date },
    expectedPaymentDate: { type: Date },
    paymentReceivedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    notes: { type: String },
    currency: { type: String, default: 'INR' },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'offlinepayments',
  },
);

OfflinePaymentSchema.index({ createdAt: 1 });
OfflinePaymentSchema.index({ studentId: 1, courseId: 1, paymentStatus: 1 });

const OfflinePaymentModel =
  (mongoose.models.OfflinePayment as mongoose.Model<OfflinePaymentDocument> | undefined) ??
  mongoose.model<OfflinePaymentDocument>('OfflinePayment', OfflinePaymentSchema);

export default OfflinePaymentModel;
