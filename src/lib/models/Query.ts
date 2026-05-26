import mongoose from "mongoose";

export type QueryStatus = "pending" | "approved" | "rejected";
export type QueryRole = "student" | "teacher" | "senior_teacher";

export interface QueryDocument extends mongoose.Document {
  role: QueryRole;
  userId: mongoose.Types.ObjectId;
  personName: string;
  personEmail: string;
  remarks: string;
  status: QueryStatus;
  adminRemark?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  /** @deprecated Legacy student fields — use role + userId + personName/Email */
  studentId?: mongoose.Types.ObjectId;
  studentName?: string;
  studentEmail?: string;
  /** @deprecated Legacy teacher fields */
  teacherId?: mongoose.Types.ObjectId;
  teacherName?: string;
  teacherEmail?: string;
  /** @deprecated Legacy senior teacher fields */
  seniorTeacherId?: mongoose.Types.ObjectId;
  seniorTeacherName?: string;
  seniorTeacherEmail?: string;
}

const QuerySchema = new mongoose.Schema<QueryDocument>(
  {
    role: {
      type: String,
      enum: ["student", "teacher", "senior_teacher"],
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    personName: { type: String, required: true, trim: true },
    personEmail: { type: String, required: true, trim: true, lowercase: true },
    remarks: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    adminRemark: { type: String, trim: true, default: "" },
    reviewedAt: { type: Date },
  },
  { timestamps: true, collection: "queries", strict: false },
);

QuerySchema.index({ role: 1, userId: 1, createdAt: -1 });
QuerySchema.index({ status: 1, createdAt: -1 });

const QueryModel =
  (mongoose.models.Query as mongoose.Model<QueryDocument> | undefined) ??
  mongoose.model<QueryDocument>("Query", QuerySchema);

export default QueryModel;

/** @deprecated Use Query model — collection is `queries` */
export { QueryModel as StudentQueryModel };
