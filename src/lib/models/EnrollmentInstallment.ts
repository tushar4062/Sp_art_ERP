import mongoose from "mongoose";

export type InstallmentPaymentStatus = "pending" | "paid" | "overdue" | "failed";

export interface EnrollmentInstallmentDocument extends mongoose.Document {
  enrollmentId: mongoose.Types.ObjectId;
  termNo: number;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  paymentStatus: InstallmentPaymentStatus;
  remindersSent: string[];
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentInstallmentSchema = new mongoose.Schema<EnrollmentInstallmentDocument>(
  {
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseEnrollment",
      required: true,
      index: true,
    },
    termNo: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "overdue", "failed"],
      default: "pending",
      index: true,
    },
    remindersSent: { type: [String], default: [] },
  },
  { timestamps: true, collection: "enrollment_installments" },
);

EnrollmentInstallmentSchema.index({ enrollmentId: 1, termNo: 1 }, { unique: true });
EnrollmentInstallmentSchema.index({ dueDate: 1, paymentStatus: 1 });

const EnrollmentInstallmentModel =
  (mongoose.models.EnrollmentInstallment as
    | mongoose.Model<EnrollmentInstallmentDocument>
    | undefined) ??
  mongoose.model<EnrollmentInstallmentDocument>(
    "EnrollmentInstallment",
    EnrollmentInstallmentSchema,
  );

export default EnrollmentInstallmentModel;
