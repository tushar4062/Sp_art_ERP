import mongoose from "mongoose";

export interface ReferralTransactionDocument extends mongoose.Document {
  referrerId: mongoose.Types.ObjectId;
  referredStudentId: mongoose.Types.ObjectId;
  referredStudentName: string;
  referralCode: string;
  referralPercentage: number;
  enrollmentId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  courseTitle?: string;
  courseAmount: number;
  earnedAmount: number;
  enrollmentStatus: boolean;
  paymentStatus: string;
  orderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralTransactionSchema = new mongoose.Schema<ReferralTransactionDocument>(
  {
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    referredStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    referredStudentName: { type: String, required: true },
    referralCode: { type: String, required: true, uppercase: true, trim: true },
    referralPercentage: { type: Number, required: true, min: 0, max: 100 },
    enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: "CourseEnrollment" },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    courseTitle: { type: String },
    courseAmount: { type: Number, default: 0, min: 0 },
    earnedAmount: { type: Number, default: 0, min: 0 },
    enrollmentStatus: { type: Boolean, default: false, index: true },
    paymentStatus: { type: String, default: "pending" },
    orderId: { type: String, sparse: true },
  },
  { timestamps: true, collection: "referral_transactions" },
);

ReferralTransactionSchema.index({ referrerId: 1, createdAt: -1 });
ReferralTransactionSchema.index({ orderId: 1 }, { unique: true, sparse: true });

const ReferralTransactionModel =
  (mongoose.models.ReferralTransaction as mongoose.Model<ReferralTransactionDocument> | undefined) ??
  mongoose.model<ReferralTransactionDocument>("ReferralTransaction", ReferralTransactionSchema);

export default ReferralTransactionModel;
