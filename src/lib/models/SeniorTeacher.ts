import mongoose from 'mongoose';

export interface SeniorTeacherDocument extends mongoose.Document {
  fullName: string;
  badgeId?: string;
  email: string;
  phone: string;
  dob?: Date;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  specialization: string;
  yearsOfExperience: number;
  role: string;
  qualification: string;
  address: string;
  joiningDate: Date;
  salary: number;
  bio?: string;
  profileImage?: string;
  courseName?: string;
  branchName?: string;
  status: 'Active' | 'Inactive';
  assignedClasses: number;
  createdAt: Date;
  updatedAt: Date;
}

const SeniorTeacherSchema = new mongoose.Schema<SeniorTeacherDocument>({
  fullName: { type: String, required: true },
  badgeId: { type: String },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  dob: { type: Date },
  age: { type: Number },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  bloodGroup: { type: String },
  specialization: { type: String, required: true },
  yearsOfExperience: { type: Number, required: true, default: 0 },
  role: {
    type: String,
    enum: ['Senior Faculty', 'Head Instructor', 'Master Trainer', 'Workshop Mentor', 'Senior Teacher', 'Lead Instructor', 'Department Head'],
    required: true,
  },
  qualification: { type: String, required: true },
  address: { type: String, required: true },
  joiningDate: { type: Date, required: true },
  salary: { type: Number, required: true, default: 0 },
  bio: { type: String },
  profileImage: { type: String },
  courseName: { type: String },
  branchName: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  assignedClasses: { type: Number, default: 0 },
}, {
  timestamps: true,
  collection: 'seniorteachers',
});

const SeniorTeacherModel = mongoose.models.SeniorTeacher as mongoose.Model<SeniorTeacherDocument>;
export default SeniorTeacherModel || mongoose.model<SeniorTeacherDocument>('SeniorTeacher', SeniorTeacherSchema);
