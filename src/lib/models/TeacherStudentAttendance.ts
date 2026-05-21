import mongoose from "mongoose";

export interface AttendanceStudent {
  studentId: mongoose.Types.ObjectId;
  studentName: string;
  studentEmail: string;
  phone: string;
  status: "Present" | "Absent";
  remark?: string;
}

export interface TeacherStudentAttendanceDocument extends mongoose.Document {
  batchId: mongoose.Types.ObjectId;
  batchName: string;
  courseName: string;
  teacherId: mongoose.Types.ObjectId;
  teacherName: string;
  date: Date;
  students: AttendanceStudent[];
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceStudentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    studentName: { type: String, required: true, trim: true },
    studentEmail: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["Present", "Absent"],
      required: true,
    },
    remark: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const TeacherStudentAttendanceSchema = new mongoose.Schema<TeacherStudentAttendanceDocument>(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    batchName: { type: String, required: true, trim: true },
    courseName: { type: String, required: true, trim: true },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    teacherName: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    students: { type: [AttendanceStudentSchema], default: [] },
  },
  { timestamps: true, collection: "teacher_student_attendance" }
);

// Create compound index to prevent duplicates
TeacherStudentAttendanceSchema.index(
  { batchId: 1, date: 1 },
  { unique: true }
);

const TeacherStudentAttendanceModel =
  (mongoose.models
    .TeacherStudentAttendance as mongoose.Model<TeacherStudentAttendanceDocument> | undefined) ??
  mongoose.model<TeacherStudentAttendanceDocument>(
    "TeacherStudentAttendance",
    TeacherStudentAttendanceSchema
  );

export default TeacherStudentAttendanceModel;
