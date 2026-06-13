import mongoose from "mongoose";

export interface EnrollmentPaymentRecordDocument extends mongoose.Document {
  enrollmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  termNo: number;
  amount: number;
  gstAmount: number;
  installmentChargePortion: number;
  paymentId: string;
  orderId: string;
  paymentStatus: string;
  paymentMethod: string;
  invoiceId?: string;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentPaymentRecordSchema = new mongoose.Schema<EnrollmentPaymentRecordDocument>(
  {
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseEnrollment",
      required: true,
      index: true,
    },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    termNo: { type: Number, required: true, min: 0, default: 1 },
    amount: { type: Number, required: true },
    gstAmount: { type: Number, default: 0 },
    installmentChargePortion: { type: Number, default: 0 },
    paymentId: { type: String, required: true },
    orderId: { type: String, required: true, unique: true },
    paymentStatus: { type: String, default: "paid" },
    paymentMethod: { type: String, default: "Razorpay" },
    invoiceId: { type: String },
    paidAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, collection: "enrollment_payment_records" },
);

EnrollmentPaymentRecordSchema.index({ enrollmentId: 1, paidAt: -1 });

const EnrollmentPaymentRecordModel =
  (mongoose.models.EnrollmentPaymentRecord as
    | mongoose.Model<EnrollmentPaymentRecordDocument>
    | undefined) ??
  mongoose.model<EnrollmentPaymentRecordDocument>(
    "EnrollmentPaymentRecord",
    EnrollmentPaymentRecordSchema,
  );

export default EnrollmentPaymentRecordModel;
