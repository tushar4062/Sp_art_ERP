import mongoose from "mongoose";

/** Embedded roster line — same person may appear multiple times. */
export interface BatchEmbeddedStudent {
  _id: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  studentName: string;
  studentEmail: string;
  phone: string;
  course: string;
  batchDay: string;
  batchTime: string;
  startMonth: string;
  endMonth: string;
}

export interface BatchAttendanceSummary {
  totalSessions: number;
  completedSessions: number;
  averageAttendancePercent: number;
}

export type BatchStatus = "Active" | "Inactive" | "Completed";

export interface BatchDocument extends mongoose.Document {
  batchName: string;
  batchCode?: string;
  courseName: string;
  /** Combined schedule label */
  batchTiming?: string;
  batchDay: string;
  batchTime: string;
  startDate?: string;
  endDate?: string;
  startMonth: string;
  endMonth: string;
  roomNumber?: string;
  branch: string;
  maxStudents?: number;
  batchCapacity: number;
  batchStatus: BatchStatus;
  description: string;
  /** Assigned students (embedded roster) */
  students: BatchEmbeddedStudent[];
  /** Assigned teachers — query with: teacherIds: loggedInTeacherId */
  teacherIds: mongoose.Types.ObjectId[];
  attendanceSummary: BatchAttendanceSummary;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BatchStudentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
    studentName: { type: String, required: true, trim: true },
    studentEmail: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    course: { type: String, default: "", trim: true },
    batchDay: { type: String, default: "", trim: true },
    batchTime: { type: String, default: "", trim: true },
    startMonth: { type: String, default: "", trim: true },
    endMonth: { type: String, default: "", trim: true },
  },
  { _id: true },
);

const AttendanceSummarySchema = new mongoose.Schema(
  {
    totalSessions: { type: Number, default: 0 },
    completedSessions: { type: Number, default: 0 },
    averageAttendancePercent: { type: Number, default: 0 },
  },
  { _id: false },
);

const BatchSchema = new mongoose.Schema<BatchDocument>(
  {
    batchName: { type: String, required: true, trim: true },
    batchCode: { type: String, trim: true, index: true },
    courseName: { type: String, required: true, trim: true },
    batchTiming: { type: String, trim: true },
    batchDay: { type: String, required: true, trim: true },
    batchTime: { type: String, required: true, trim: true },
    startDate: { type: String, trim: true, default: "" },
    endDate: { type: String, trim: true, default: "" },
    startMonth: { type: String, trim: true, default: "" },
    endMonth: { type: String, trim: true, default: "" },
    roomNumber: { type: String, trim: true },
    branch: { type: String, required: true, trim: true },
    maxStudents: { type: Number, min: 1 },
    batchCapacity: { type: Number, required: true, min: 1 },
    batchStatus: {
      type: String,
      enum: ["Active", "Inactive", "Completed"],
      default: "Active",
      index: true,
    },
    description: { type: String, default: "", trim: true },
    students: { type: [BatchStudentSchema], default: [] },
    teacherIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Teacher", index: true }],
    attendanceSummary: {
      type: AttendanceSummarySchema,
      default: () => ({ totalSessions: 0, completedSessions: 0, averageAttendancePercent: 0 }),
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "SeniorTeacher", index: true },
  },
  { timestamps: true, collection: "batches" },
);

BatchSchema.index({ teacherIds: 1 });

const BatchModel =
  (mongoose.models.Batch as mongoose.Model<BatchDocument> | undefined) ??
  mongoose.model<BatchDocument>("Batch", BatchSchema);

export default BatchModel;
