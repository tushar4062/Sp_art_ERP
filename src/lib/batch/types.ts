export type SerializedTeacherMini = { id: string; fullName: string; email: string; isSenior?: boolean };

export type SerializedBatchStudent = {
  id: string;
  studentName: string;
  studentEmail: string;
  phone: string;
  course: string;
  batchDay: string;
  batchTime: string;
  startMonth: string;
  endMonth: string;
};

export type SerializedBatch = {
  id: string;
  batchName: string;
  courseName: string;
  batchDay: string;
  batchTime: string;
  startMonth: string;
  endMonth: string;
  branch: string;
  batchCapacity: number;
  description: string;
  students: SerializedBatchStudent[];
  teacherIds: string[];
  teachers?: SerializedTeacherMini[];
  totalStudents: number;
  attendanceSummary: {
    totalSessions: number;
    completedSessions: number;
    averageAttendancePercent: number;
  };
  createdAt: string;
  updatedAt: string;
};
