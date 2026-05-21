import { AttendanceReportsPage } from "@/components/attendance/AttendanceReportsPage";

export default function SeniorTeacherAttendancePage() {
  return (
    <AttendanceReportsPage
      portal="senior"
      title="Attendance reports"
      subtitle="View batch and student attendance marked by your teachers."
    />
  );
}
