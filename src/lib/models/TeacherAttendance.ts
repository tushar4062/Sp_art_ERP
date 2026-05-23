import mongoose from "mongoose";

export type StaffAttendanceRole = "teacher" | "senior-teacher";
export type TeacherAttendanceStatus = "Present" | "Absent" | "Half Day";

export interface TeacherAttendanceDocument extends mongoose.Document {
  /** Staff user id (teacher or senior teacher MongoDB _id) */
  teacherId: mongoose.Types.ObjectId;
  /** Denormalized display name at time of marking */
  userName?: string;
  role: StaffAttendanceRole;
  batchId: mongoose.Types.ObjectId;
  batchName: string;
  attendanceDate: string;
  status: TeacherAttendanceStatus;
  remarks: string;
  markedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherAttendanceSchema = new mongoose.Schema<TeacherAttendanceDocument>(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userName: { type: String, default: "", trim: true },
    role: {
      type: String,
      enum: ["teacher", "senior-teacher"],
      default: "teacher",
      required: true,
      index: true,
    },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true, index: true },
    batchName: { type: String, default: "", trim: true },
    attendanceDate: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      enum: ["Present", "Absent", "Half Day"],
      required: true,
    },
    remarks: { type: String, default: "", trim: true },
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "teacher_attendances" },
);

TeacherAttendanceSchema.index(
  { role: 1, teacherId: 1, batchId: 1, attendanceDate: 1 },
  { unique: true },
);
TeacherAttendanceSchema.index({ batchId: 1, attendanceDate: 1 });
TeacherAttendanceSchema.index({ role: 1, attendanceDate: 1 });

const TeacherAttendanceModel =
  (mongoose.models.TeacherAttendance as mongoose.Model<TeacherAttendanceDocument> | undefined) ??
  mongoose.model<TeacherAttendanceDocument>("TeacherAttendance", TeacherAttendanceSchema);

export default TeacherAttendanceModel;
