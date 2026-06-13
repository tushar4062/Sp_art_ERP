import mongoose from 'mongoose';
import Course from './Course';

export type EnrollmentPaymentType = 'full' | 'installment';
export type EnrollmentPaymentPlanStatus =
  | 'paid'
  | 'partially_paid'
  | 'pending'
  | 'overdue'
  | 'failed';

export interface CourseEnrollmentDocument extends mongoose.Document {
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  enrollmentDate: Date;
  status: 'active' | 'completed' | 'dropped';
  completionPercentage: number;
  createdAt: Date;
  updatedAt: Date;
  paymentType?: EnrollmentPaymentType;
  paymentId?: string;
  orderId?: string;
  amount?: number;
  baseAmount?: number;
  totalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: string;
  paymentPlanStatus?: EnrollmentPaymentPlanStatus;
  paymentMethod?: string;
  discountPercentage?: number;
  discountAmount?: number;
  taxAmount?: number;
  installmentCharge?: number;
  invoiceId?: string;
  invoiceGeneratedAt?: Date;
}

const CourseEnrollmentSchema = new mongoose.Schema<CourseEnrollmentDocument>(
  {
    studentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Student', 
      required: true 
    },
    courseId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Course', 
      required: true 
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
    },
    enrollmentDate: { 
      type: Date, 
      required: true, 
      default: () => new Date() 
    },
    status: { 
      type: String, 
      enum: ['active', 'completed', 'dropped'], 
      default: 'active' 
    },
    completionPercentage: { 
      type: Number, 
      default: 0, 
      min: 0, 
      max: 100 
    },
    paymentType: { type: String, enum: ['full', 'installment'], default: 'full' },
    paymentId: { type: String },
    orderId: { type: String },
    amount: { type: Number },
    baseAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    paymentStatus: { type: String },
    paymentPlanStatus: {
      type: String,
      enum: ['paid', 'partially_paid', 'pending', 'overdue', 'failed'],
      default: 'pending',
    },
    paymentMethod: { type: String, default: 'Razorpay' },
    discountPercentage: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    installmentCharge: { type: Number, default: 0 },
    invoiceId: { type: String, unique: true, sparse: true },
    invoiceGeneratedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'courseenrollments',
  }
);

// Index to prevent duplicate enrollments for same student-course pair
CourseEnrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

const CourseEnrollmentModel =
  (mongoose.models.CourseEnrollment as mongoose.Model<CourseEnrollmentDocument> | undefined) ??
  mongoose.model<CourseEnrollmentDocument>('CourseEnrollment', CourseEnrollmentSchema);

export default CourseEnrollmentModel;
