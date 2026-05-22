import mongoose from "mongoose";

export type LeaveStatus = "Pending" | "Approved" | "Rejected";
export type LeaveType = "Casual" | "Sick" | "Personal";

export interface LeaveDocument extends mongoose.Document {
  teacherId: mongoose.Types.ObjectId;
  teacherName: string;
  teacherEmail: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
  adminRemark: string;
  daysCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema = new mongoose.Schema<LeaveDocument>(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true, index: true },
    teacherName: { type: String, required: true, trim: true },
    teacherEmail: { type: String, required: true, trim: true, lowercase: true },
    leaveType: { type: String, enum: ["Casual", "Sick", "Personal"], required: true },
    fromDate: { type: String, required: true, index: true },
    toDate: { type: String, required: true },
    reason: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    adminRemark: { type: String, default: "", trim: true },
    daysCount: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true, collection: "leaves" },
);

LeaveSchema.index(
  { teacherId: 1, leaveType: 1, fromDate: 1, toDate: 1, reason: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "Pending" },
    name: "unique_teacher_pending_leave",
  },
);

const LeaveModel =
  (mongoose.models.Leave as mongoose.Model<LeaveDocument> | undefined) ??
  mongoose.model<LeaveDocument>("Leave", LeaveSchema);

export default LeaveModel;
