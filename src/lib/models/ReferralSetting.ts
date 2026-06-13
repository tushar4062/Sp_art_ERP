import mongoose from "mongoose";

export type ReferralPercentage = 5 | 10 | 15 | 20;

export interface ReferralSettingDocument extends mongoose.Document {
  percentage: ReferralPercentage;
  status: "active" | "inactive";
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSettingSchema = new mongoose.Schema<ReferralSettingDocument>(
  {
    percentage: { type: Number, enum: [5, 10, 15, 20], required: true },
    status: { type: String, enum: ["active", "inactive"], default: "inactive" },
    expiresAt: { type: Date },
  },
  { timestamps: true, collection: "referral_settings" },
);

ReferralSettingSchema.index({ status: 1 });

const ReferralSettingModel =
  (mongoose.models.ReferralSetting as mongoose.Model<ReferralSettingDocument> | undefined) ??
  mongoose.model<ReferralSettingDocument>("ReferralSetting", ReferralSettingSchema);

export default ReferralSettingModel;
