import { AttendanceReportsPage } from "@/components/attendance/AttendanceReportsPage";

export default function AdminSeniorTeacherAttendancePage() {
  return (
    <AttendanceReportsPage
      portal="admin"
      title="Attendance reports"
      subtitle="Academy-wide attendance marked by teachers."
    />
  );
}
