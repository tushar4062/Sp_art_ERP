export type AttendanceStatus = "Present" | "Absent" | "Half Day";

export type TodayAttendance = {
  alreadyMarked: boolean;
  status: AttendanceStatus | null;
  remarks: string;
};

export const EMPTY_TODAY_ATTENDANCE: TodayAttendance = {
  alreadyMarked: false,
  status: null,
  remarks: "",
};

export type BatchRow = {
  id: string;
  batchName: string;
  courseName: string;
  batchTiming: string;
  batchDay: string;
  batchTime: string;
  totalStudents: number;
  batchStatus: string;
  todayAttendance: TodayAttendance;
};

export function normalizeBatchRow(batch: BatchRow): BatchRow {
  const today = batch.todayAttendance ?? EMPTY_TODAY_ATTENDANCE;
  return {
    ...batch,
    todayAttendance: {
      alreadyMarked: Boolean(today.alreadyMarked),
      status: today.status ?? null,
      remarks: today.remarks ?? "",
    },
  };
}
