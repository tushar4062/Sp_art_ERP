import { z } from "zod";

export const attendanceStatusSchema = z.enum(["Present", "Absent"]);

export const attendanceEntrySchema = z.object({
  studentId: z.string().min(1),
  status: attendanceStatusSchema,
  remarks: z.string().trim().max(500).optional().default(""),
});

export const attendanceBulkSchema = z.object({
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  entries: z.array(attendanceEntrySchema).min(1),
});

export const attendanceUpdateSchema = z.object({
  status: attendanceStatusSchema.optional(),
  remarks: z.string().trim().max(500).optional(),
});
