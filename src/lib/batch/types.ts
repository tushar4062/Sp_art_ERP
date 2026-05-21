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
  batchCode: string;
  courseName: string;
  batchTiming: string;
  batchDay: string;
  batchTime: string;
  startDate: string;
  endDate: string;
  startMonth: string;
  endMonth: string;
  roomNumber: string;
  branch: string;
  maxStudents: number;
  batchCapacity: number;
  batchStatus: string;
  description: string;
  students: SerializedBatchStudent[];
  assignedStudents: SerializedBatchStudent[];
  teacherIds: string[];
  assignedTeachers: string[];
  teachers?: SerializedTeacherMini[];
  totalStudents: number;
  attendanceSummary: {
    totalSessions: number;
    completedSessions: number;
    averageAttendancePercent: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
