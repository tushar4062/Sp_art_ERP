"use client";

import { StaffSelfAttendancePage } from "@/components/attendance/StaffSelfAttendancePage";

export default function SeniorTeacherSelfAttendancePage() {
  return (
    <StaffSelfAttendancePage
      apiPath="/api/senior-teacher/self-attendance"
      roleLabel="senior teacher"
      title="My Attendance"
      subtitle="Mark day-wise attendance for each assigned batch — today only, one entry per batch per day."
      batchesHref="/senior-teacher/batches"
    />
  );
}
