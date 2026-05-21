import mongoose from 'mongoose';

export type CourseStatus = 'active' | 'inactive';

export interface CourseDocument extends mongoose.Document {
  courseTitle: string;
  courseCode: string;
  instructor?: string;
  duration: number;
  startDate: Date;
  endDate: Date;
  totalFees: number;
  discountFees: number;
  discountPercentage: number;
  status: CourseStatus;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new mongoose.Schema<CourseDocument>(
  {
    courseTitle: { type: String, required: true },
    courseCode: { type: String, required: true, unique: true, sparse: true },
    instructor: { type: String },
    duration: { type: Number, required: true, default: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalFees: { type: Number, required: true, default: 0 },
    discountFees: { type: Number, required: true, default: 0 },
    discountPercentage: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    notes: { type: String },
    createdBy: { type: String },
  },
  {
    timestamps: true,
    collection: 'courses',
  }
);

const CourseModel =
  (mongoose.models.Course as mongoose.Model<CourseDocument> | undefined) ??
  mongoose.model<CourseDocument>('Course', CourseSchema);

export default CourseModel;
