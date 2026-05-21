import mongoose from 'mongoose';

export interface TeacherDocument extends mongoose.Document {
  fullName: string;
  badgeId?: string;
  email: string;
  phone?: string;
  dob?: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  schoolCollege?: string;
  parentGuardianDetails?: string;
  address?: string;
  className?: string;
  currentSubjectCourse?: string;
  experience: number;
  batchDetails?: string;
  specialization: string;
  role?: string;
  photo?: string;
  qualification?: string;
  school?: string;
  college?: string;
  joiningDate?: string;
  salary?: number;
  branchName?: string;
  bio?: string;
  classes: string[];
  status: 'Active' | 'Inactive';
  isSenior: boolean;
  /** Senior teacher who manages this teacher record */
  createdBy?: mongoose.Types.ObjectId;
  /** Batches this teacher is assigned to (synced from Batch.teacherIds) */
  assignedBatches?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const TeacherSchema = new mongoose.Schema<TeacherDocument>(
  {
    fullName: { type: String, required: true },
    badgeId: { type: String },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    dob: { type: String },
    age: { type: Number },
    gender: { type: String },
    bloodGroup: { type: String },
    schoolCollege: { type: String },
    parentGuardianDetails: { type: String },
    address: { type: String },
    photo: { type: String },
    className: { type: String },
    currentSubjectCourse: { type: String },
    experience: { type: Number, required: true, default: 1 },
    batchDetails: { type: String },
    specialization: { type: String, required: true },
    role: { type: String },
    qualification: { type: String },
    school: { type: String },
    college: { type: String },
    joiningDate: { type: String },
    salary: { type: Number },
    branchName: { type: String },
    bio: { type: String },
    classes: { type: [String], default: [] },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    isSenior: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SeniorTeacher', index: true },
    assignedBatches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  },
  {
    timestamps: true,
    collection: 'teachers',
  }
);

const TeacherModel =
  (mongoose.models.Teacher as mongoose.Model<TeacherDocument> | undefined) ??
  mongoose.model<TeacherDocument>("Teacher", TeacherSchema);

export default TeacherModel;
