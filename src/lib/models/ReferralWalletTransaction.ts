import mongoose from "mongoose";

export interface ReferralWalletTransactionDocument extends mongoose.Document {
  studentId: mongoose.Types.ObjectId;
  type: "credit" | "debit" | "withdrawal";
  amount: number;
  description: string;
  referralTransactionId?: mongoose.Types.ObjectId;
  balanceAfter: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralWalletTransactionSchema = new mongoose.Schema<ReferralWalletTransactionDocument>(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    type: { type: String, enum: ["credit", "debit", "withdrawal"], required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    referralTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "ReferralTransaction" },
    balanceAfter: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, collection: "referral_wallet_transactions" },
);

ReferralWalletTransactionSchema.index({ studentId: 1, createdAt: -1 });

const ReferralWalletTransactionModel =
  (mongoose.models.ReferralWalletTransaction as
    | mongoose.Model<ReferralWalletTransactionDocument>
    | undefined) ??
  mongoose.model<ReferralWalletTransactionDocument>(
    "ReferralWalletTransaction",
    ReferralWalletTransactionSchema,
  );

export default ReferralWalletTransactionModel;
