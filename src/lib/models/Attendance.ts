import mongoose from "mongoose";

export type AttendanceStatus = "Present" | "Absent";

export interface AttendanceDocument extends mongoose.Document {
  studentId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  attendanceDate: string;
  status: AttendanceStatus;
  remarks: string;
  markedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new mongoose.Schema<AttendanceDocument>(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true, index: true },
    attendanceDate: { type: String, required: true, trim: true, index: true },
    status: { type: String, enum: ["Present", "Absent"], required: true },
    remarks: { type: String, default: "", trim: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  },
  { timestamps: true, collection: "attendances" },
);

AttendanceSchema.index({ batchId: 1, attendanceDate: 1, studentId: 1 }, { unique: true });
AttendanceSchema.index({ batchId: 1, attendanceDate: 1 });
AttendanceSchema.index({ studentId: 1, batchId: 1 });

const AttendanceModel =
  (mongoose.models.Attendance as mongoose.Model<AttendanceDocument> | undefined) ??
  mongoose.model<AttendanceDocument>("Attendance", AttendanceSchema);

export default AttendanceModel;
