import { z } from "zod";

export const teacherAttendanceMarkSchema = z.object({
  status: z.enum(["Present", "Absent"]),
  remarks: z.string().trim().max(500).optional().default(""),
});
