"use client";

import { StaffSelfAttendancePage } from "@/components/attendance/StaffSelfAttendancePage";

export default function TeacherSelfAttendancePage() {
  return (
    <StaffSelfAttendancePage
      apiPath="/api/teacher/self-attendance"
      roleLabel="teacher"
      title="My Attendance"
      subtitle="Mark day-wise attendance for each assigned batch — today only, one entry per batch per day."
      batchesHref="/teacher/batches"
      studentAttendanceHref="/teacher/student-attendance"
    />
  );
}
