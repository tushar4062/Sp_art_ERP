import mongoose from "mongoose";

export interface StudentReferralProfileDocument extends mongoose.Document {
  studentId: mongoose.Types.ObjectId;
  referralCode: string;
  totalReferrals: number;
  totalEarnings: number;
  availableBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

const StudentReferralProfileSchema = new mongoose.Schema<StudentReferralProfileDocument>(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true,
    },
    referralCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    totalReferrals: { type: Number, default: 0, min: 0 },
    totalEarnings: { type: Number, default: 0, min: 0 },
    availableBalance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "student_referral_profiles" },
);

StudentReferralProfileSchema.index({ referralCode: 1 });

const StudentReferralProfileModel =
  (mongoose.models.StudentReferralProfile as
    | mongoose.Model<StudentReferralProfileDocument>
    | undefined) ??
  mongoose.model<StudentReferralProfileDocument>(
    "StudentReferralProfile",
    StudentReferralProfileSchema,
  );

export default StudentReferralProfileModel;
