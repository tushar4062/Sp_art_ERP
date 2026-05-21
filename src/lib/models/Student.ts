import mongoose from 'mongoose';

export interface StudentDocument extends mongoose.Document {
  fullName: string;
  email?: string;
  passwordHash?: string;
  badgeId: string;
  className: string;
  parentName?: string;
  phone?: string;
  photo?: string;
  dob?: Date;
  age?: number;
  bloodGroup?: string;
  gender?: string;
  school?: string;
  college?: string;
  occupation?: string;
  fatherName?: string;
  fatherMobile?: string;
  motherName?: string;
  motherMobile?: string;
  address?: string;
  currentCourse?: string;
  batchDays?: string;
  batchTime?: string;
  courseDurationMonths: number;
  courseEndDate?: Date;
  artTeacher?: string;
  vanFacility: boolean;
  feeStatus: 'Paid' | 'Pending' | 'Overdue';
  /** Senior teacher who manages this student record */
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new mongoose.Schema<StudentDocument>({
  fullName: { type: String, required: true },
  email: { type: String },
  passwordHash: { type: String, select: false },
  badgeId: { type: String, required: true, unique: true },
  className: { type: String, required: true },
  parentName: { type: String },
  phone: { type: String },
  photo: { type: String },
  dob: { type: Date },
  age: { type: Number },
  bloodGroup: { type: String },
  gender: { type: String },
  school: { type: String },
  college: { type: String },
  occupation: { type: String },
  fatherName: { type: String },
  fatherMobile: { type: String },
  motherName: { type: String },
  motherMobile: { type: String },
  address: { type: String },
  currentCourse: { type: String },
  batchDays: { type: String },
  batchTime: { type: String },
  courseDurationMonths: { type: Number, default: 12 },
  courseEndDate: { type: Date },
  artTeacher: { type: String },
  vanFacility: { type: Boolean, default: false },
  feeStatus: { type: String, enum: ['Paid', 'Pending', 'Overdue'], default: 'Pending' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SeniorTeacher', index: true },
}, {
  timestamps: true,
  collection: 'students',
});

const StudentModel =
  (mongoose.models.Student as mongoose.Model<StudentDocument> | undefined) ??
  mongoose.model<StudentDocument>('Student', StudentSchema);

export default StudentModel;