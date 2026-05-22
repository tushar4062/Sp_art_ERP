import type { BatchWriteInput } from "@/lib/validators/batch";
import type { BatchDocument } from "@/lib/models/Batch";
import mongoose from "mongoose";

export function generateBatchCode(batchName: string): string {
  const slug = batchName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12);
  const suffix = Date.now().toString(36).toUpperCase().slice(-4);
  return `BATCH-${slug || "NEW"}-${suffix}`;
}

export function applyBatchWriteToDocument(batch: BatchDocument, data: BatchWriteInput) {
  batch.batchName = data.batchName;
  batch.courseName = data.courseName;
  batch.batchDay = data.batchDay;
  batch.batchTime = data.batchTime;
  batch.startMonth = data.startMonth;
  batch.endMonth = data.endMonth;
  batch.branch = data.branch;
  batch.batchCapacity = data.batchCapacity;
  batch.description = data.description ?? "";

  batch.batchTiming = data.batchTiming?.trim() || `${data.batchDay} · ${data.batchTime}`;
  batch.startDate = data.startDate?.trim() || data.startMonth;
  batch.endDate = data.endDate?.trim() || data.endMonth;
  batch.roomNumber = data.roomNumber?.trim() || data.branch;
  batch.maxStudents = data.maxStudents ?? data.batchCapacity;
  batch.batchCode = data.batchCode?.trim() || batch.batchCode || generateBatchCode(data.batchName);
  batch.batchStatus = data.batchStatus ?? batch.batchStatus ?? "Active";

  batch.set(
    "students",
    data.students.map(s => {
      const studentObj: any = {
        studentName: s.studentName,
        studentEmail: s.studentEmail || "",
        phone: s.phone || "",
        course: s.course || "",
        batchDay: s.batchDay || "",
        batchTime: s.batchTime || "",
        startMonth: s.startMonth || "",
        endMonth: s.endMonth || "",
      };
      if (s.studentId && mongoose.Types.ObjectId.isValid(s.studentId)) {
        studentObj.studentId = new mongoose.Types.ObjectId(s.studentId);
      }
      return studentObj;
    }),
  );
}
