import { z } from "zod";

export const BATCH_DAY_OPTIONS = [
  "Mon-Wed-Fri",
  "Tue-Thu",
  "Weekend (Sat-Sun)",
  "Monday only",
  "Daily",
  "Custom / Other",
] as const;

export const batchStudentInputSchema = z.object({
  studentId: z.string().trim().optional().default(""),
  studentName: z.string().trim().min(1, "Student name is required"),
  studentEmail: z
    .string()
    .trim()
    .default("")
    .refine(v => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid student email"),
  phone: z.string().trim().optional().default(""),
  course: z.string().trim().optional().default(""),
  batchDay: z.string().trim().optional().default(""),
  batchTime: z.string().trim().optional().default(""),
  startMonth: z.string().trim().optional().default(""),
  endMonth: z.string().trim().optional().default(""),
});

export const BATCH_STATUS_OPTIONS = ["Active", "Inactive", "Completed"] as const;

export const batchWriteSchema = z.object({
  batchName: z.string().trim().min(2, "Batch name is required"),
  batchCode: z.string().trim().optional(),
  courseName: z.string().trim().min(1, "Course is required"),
  batchTiming: z.string().trim().optional(),
  batchDay: z.string().trim().min(1, "Batch schedule is required"),
  batchTime: z.string().trim().min(1, "Batch time is required"),
  startDate: z.string().trim().optional().default(""),
  endDate: z.string().trim().optional().default(""),
  startMonth: z.string().trim().optional().default(""),
  endMonth: z.string().trim().optional().default(""),
  roomNumber: z.string().trim().optional(),
  branch: z.string().trim().min(1, "Branch is required"),
  maxStudents: z.coerce.number().int().min(1).max(500).optional(),
  batchCapacity: z.coerce.number().int().min(1).max(500),
  batchStatus: z.enum(BATCH_STATUS_OPTIONS).optional().default("Active"),
  description: z.string().trim().optional().default(""),
  students: z.array(batchStudentInputSchema).optional().default([]),
  teacherIds: z.array(z.string().min(1)).optional().default([]),
});

export type BatchWriteInput = z.infer<typeof batchWriteSchema>;
