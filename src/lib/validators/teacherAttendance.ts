import { z } from "zod";
import { attendanceDateValidationError } from "@/lib/leave/dateValidation";

export const staffAttendanceStatusSchema = z.enum(["Present", "Absent", "Half Day"]);

export const staffAttendanceMarkSchema = z.object({
  batchId: z.string().min(1, "Batch is required"),
  attendanceDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .superRefine((d, ctx) => {
      const err = attendanceDateValidationError(d);
      if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
    }),
  status: staffAttendanceStatusSchema,
  remarks: z.string().trim().max(500).optional().default(""),
});

/** Legacy batch detail mark (today only). */
export const teacherAttendanceMarkSchema = z.object({
  status: staffAttendanceStatusSchema,
  remarks: z.string().trim().max(500).optional().default(""),
});
