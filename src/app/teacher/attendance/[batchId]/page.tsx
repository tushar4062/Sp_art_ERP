"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { todayDateString } from "@/lib/dates/attendanceDate";

interface BatchStudent {
  _id: string;
  studentName: string;
  studentEmail: string;
  phone: string;
}

interface BatchDetail {
  _id: string;
  batchName: string;
  courseName: string;
  batchDay: string;
  batchTime: string;
  students: BatchStudent[];
}

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  studentEmail: string;
  phone: string;
  status: "Present" | "Absent" | null;
  remark: string;
}

export default function BatchAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const batchId = Array.isArray(params?.batchId) ? params?.batchId[0] : params?.batchId;
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelectedDate(todayDateString());
  }, []);

  const fetchBatchDetails = useCallback(async (date: string) => {
    if (!batchId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/teacher/attendance/${batchId}?date=${encodeURIComponent(date)}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Unable to load batch details");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setBatch(data.batch);

      const initialRecords: Record<string, AttendanceRecord> = {};
      data.batch.students.forEach((student: BatchStudent) => {
        initialRecords[student._id] = {
          studentId: student._id,
          studentName: student.studentName,
          studentEmail: student.studentEmail,
          phone: student.phone,
          status: null,
          remark: "",
        };
      });

      if (data.attendance?.students?.length) {
        data.attendance.students.forEach((student: { studentId: string; status: "Present" | "Absent"; remark?: string }) => {
          if (initialRecords[student.studentId]) {
            initialRecords[student.studentId].status = student.status;
            initialRecords[student.studentId].remark = student.remark || "";
          }
        });
      }

      setAttendanceRecords(initialRecords);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load batch details.";
      console.error(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [batchId, toast]);

  useEffect(() => {
    if (!batchId || !selectedDate) return;
    fetchBatchDetails(selectedDate);
  }, [batchId, selectedDate, fetchBatchDetails]);

  const handleStatusChange = (studentId: string, status: "Present" | "Absent") => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarkChange = (studentId: string, remark: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remark,
      },
    }));
  };

  const presentCount = useMemo(
    () => Object.values(attendanceRecords).filter((record) => record.status === "Present").length,
    [attendanceRecords]
  );

  const absentCount = useMemo(
    () => Object.values(attendanceRecords).filter((record) => record.status === "Absent").length,
    [attendanceRecords]
  );

  const isSubmitDisabled = Object.values(attendanceRecords).every((record) => record.status === null);

  const handleSubmitAttendance = async () => {
    if (!batch) return;

    try {
      setSubmitting(true);

      const students = Object.values(attendanceRecords)
        .filter((record) => record.status !== null)
        .map((record) => ({
          studentId: record.studentId,
          studentName: record.studentName,
          studentEmail: record.studentEmail,
          phone: record.phone,
          status: record.status,
          remark: record.remark,
        }));

      if (students.length === 0) {
        toast({
          title: "No attendance marked",
          description: "Select Present or Absent for at least one student.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch("/api/teacher/attendance/save", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          batchName: batch.batchName,
          courseName: batch.courseName,
          date: selectedDate,
          students,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit attendance");
      }

      toast({
        title: "Attendance submitted",
        description: "Your attendance has been saved successfully.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save attendance.";
      console.error(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!batchId) {
    return <div className="p-4">Batch not specified.</div>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center p-4">
        <AlertCircle className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push("/teacher/attendance") }>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Take Attendance</p>
            <h1 className="text-3xl font-semibold text-slate-900">{batch?.batchName}</h1>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="rounded-[28px] border border-border bg-white shadow-sm">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">{batch?.batchName}</h2>
                <p className="text-sm text-muted-foreground">{batch?.courseName}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Course</p>
                  <p className="mt-2 text-sm font-medium">{batch?.courseName}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Schedule</p>
                  <p className="mt-2 text-sm font-medium">{batch?.batchDay} · {batch?.batchTime}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Attendance Date</p>
                  <p className="mt-2 text-sm font-medium">{selectedDate}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total Students</p>
                  <p className="mt-2 text-sm font-medium">{batch?.students.length ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-3xl"
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[28px] bg-white p-6 shadow-sm border border-border">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Summary</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-emerald-50 p-4">
                <p className="text-sm text-muted-foreground">Present</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-700">{presentCount}</p>
              </div>
              <div className="rounded-3xl bg-rose-50 p-4">
                <p className="text-sm text-muted-foreground">Absent</p>
                <p className="mt-2 text-3xl font-semibold text-rose-700">{absentCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-[28px] border border-border bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Student Attendance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Student Name</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Remark</th>
                </tr>
              </thead>
              <tbody>
                {batch?.students.length ? (
                  batch.students.map((student) => {
                    const record = attendanceRecords[student._id];
                    return (
                      <tr key={student._id} className="border-b last:border-b-0 hover:bg-slate-50">
                        <td className="px-6 py-4 align-top">
                          <div className="font-semibold text-slate-900">{student.studentName}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{student.studentEmail}</div>
                        </td>
                        <td className="px-6 py-4 align-top text-center">
                          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 p-2">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student._id, "Present")}
                              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                record?.status === "Present"
                                  ? "bg-emerald-600 text-white shadow-md"
                                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student._id, "Absent")}
                              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                record?.status === "Absent"
                                  ? "bg-rose-600 text-white shadow-md"
                                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <Input
                            type="text"
                            placeholder="Add remark..."
                            value={record?.remark || ""}
                            onChange={(e) => handleRemarkChange(student._id, e.target.value)}
                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      No students allocated to this batch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmitAttendance}
          disabled={submitting || isSubmitDisabled}
          className="rounded-full bg-gradient-to-r from-primary to-secondary px-6 py-3 text-white shadow-lg transition hover:opacity-95"
        >
          {submitting ? "Submitting..." : "Submit Attendance"}
        </Button>
      </div>
    </div>
  );
}