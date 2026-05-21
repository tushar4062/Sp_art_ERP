import mongoose from "mongoose";

export type TeacherAttendanceStatus = "Present" | "Absent";

export interface TeacherAttendanceDocument extends mongoose.Document {
  teacherId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  attendanceDate: string;
  status: TeacherAttendanceStatus;
  remarks: string;
  markedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherAttendanceSchema = new mongoose.Schema<TeacherAttendanceDocument>(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true, index: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true, index: true },
    attendanceDate: { type: String, required: true, trim: true, index: true },
    status: { type: String, enum: ["Present", "Absent"], required: true },
    remarks: { type: String, default: "", trim: true },
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "teacher_attendances" },
);

TeacherAttendanceSchema.index({ teacherId: 1, batchId: 1, attendanceDate: 1 }, { unique: true });
TeacherAttendanceSchema.index({ batchId: 1, attendanceDate: 1 });

const TeacherAttendanceModel =
  (mongoose.models.TeacherAttendance as mongoose.Model<TeacherAttendanceDocument> | undefined) ??
  mongoose.model<TeacherAttendanceDocument>("TeacherAttendance", TeacherAttendanceSchema);

export default TeacherAttendanceModel;
