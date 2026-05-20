import mongoose from 'mongoose';

export interface StudentAdmissionDocument extends mongoose.Document {
  fullName: string;
  className?: string;
  email?: string;
  mobile?: string;
  parentName?: string;
  parentMobile?: string;
  address?: string;
  admissionDate?: Date;
  notes?: string;
  amountPaid?: number;
  remainingAmount?: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentAdmissionSchema = new mongoose.Schema<StudentAdmissionDocument>(
  {
    fullName: { type: String, required: true },
    className: { type: String },
    email: { type: String },
    mobile: { type: String },
    parentName: { type: String },
    parentMobile: { type: String },
    address: { type: String },
    admissionDate: { type: Date },
    notes: { type: String },
    amountPaid: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    createdBy: { type: String },
  },
  { timestamps: true },
);

const StudentAdmissionModel = mongoose.models.StudentAdmission as mongoose.Model<StudentAdmissionDocument>;
export default StudentAdmissionModel || mongoose.model<StudentAdmissionDocument>('StudentAdmission', StudentAdmissionSchema, 'student_admissions');
