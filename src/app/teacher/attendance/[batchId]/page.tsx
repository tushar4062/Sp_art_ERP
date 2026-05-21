"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, ChevronLeft, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BatchDetail {
  _id: string;
  batchName: string;
  courseName: string;
  batchDay: string;
  batchTime: string;
  students: Array<{
    _id: string;
    studentName: string;
    studentEmail: string;
    phone: string;
  }>;
}

interface AttendanceStudent {
  studentId: string;
  studentName: string;
  status: "Present" | "Absent" | null;
  remark: string;
}

export default function BatchAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const batchId = params?.batchId;
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [attendance, setAttendance] = useState<Record<string, AttendanceStudent>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];
    setSelectedDate(dateString);
  }, []);

  useEffect(() => {
    if (!batchId || !selectedDate) return;

    const fetchBatch = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/teacher/attendance/${batchId}?date=${selectedDate}`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Batch not found");
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        setBatch(data.batch);

        const initialAttendance: Record<string, AttendanceStudent> = {};
        (data.batch.students || []).forEach((student: { _id: string; studentName: string }) => {
          initialAttendance[student._id] = {
            studentId: student._id,
            studentName: student.studentName,
            status: null,
            remark: "",
          };
        });

        if (data.attendance && data.attendance.students) {
          data.attendance.students.forEach((student: { studentId: string; studentName: string; status: "Present" | "Absent" | null; remark?: string }) => {
            if (initialAttendance[student.studentId]) {
              initialAttendance[student.studentId] = {
                studentId: student.studentId,
                studentName: student.studentName,
                status: student.status,
                remark: student.remark || "",
              };
            }
          });
          toast({
            title: "Attendance loaded",
            description: "Attendance already marked for selected date.",
          });
        }

        setAttendance(initialAttendance);
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Unable to load batch attendance.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBatch();
  }, [batchId, selectedDate, toast]);

  const presentCount = useMemo(
    () =>
      Object.values(attendance).filter((item) => item.status === "Present").length,
    [attendance]
  );

  const absentCount = useMemo(
    () =>
      Object.values(attendance).filter((item) => item.status === "Absent").length,
    [attendance]
  );

  const selectedRows = useMemo(
    () => Object.values(attendance).filter((item) => item.status !== null).length,
    [attendance]
  );

  const handleStatusChange = (studentId: string, status: "Present" | "Absent") => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarkChange = (studentId: string, remark: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remark,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!batch) return;

    const students = Object.values(attendance)
      .filter((item) => item.status !== null)
      .map((item) => ({
        studentId: item.studentId,
        studentName: item.studentName,
        status: item.status,
        remark: item.remark,
      }));

    if (students.length === 0) {
      toast({
        title: "No attendance selected",
        description: "Please mark at least one student as Present or Absent.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/teacher/attendance/save", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchId: batch._id,
          batchName: batch.batchName,
          courseName: batch.courseName,
          date: selectedDate,
          students,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Failed to save attendance");
      }

      toast({
        title: "Attendance submitted successfully",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error saving attendance",
        description: "Please try again.",
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={() => router.push("/teacher/attendance")}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to batches
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{batch?.batchName}</h1>
          <p className="text-sm text-muted-foreground">{batch?.courseName}</p>
        </div>
      </div>

      <div className="grid gap-4">
        <Card className="rounded-3xl border border-border bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Batch Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 lg:flex lg:items-start lg:gap-6">
            <div className="flex-1 space-y-3">
              <div className="rounded-3xl bg-white/60 p-4">
                <p className="text-sm font-semibold">Course</p>
                <p className="text-muted-foreground">{batch?.courseName}</p>
              </div>
              <div className="rounded-3xl bg-white/60 p-4">
                <p className="text-sm font-semibold">Batch Days</p>
                <p className="text-muted-foreground">{batch?.batchDay}</p>
              </div>
              <div className="rounded-3xl bg-white/60 p-4">
                <p className="text-sm font-semibold">Batch Time</p>
                <p className="text-muted-foreground">{batch?.batchTime}</p>
              </div>
            </div>

            <div className="w-full lg:w-72">
              <div className="rounded-3xl bg-white/60 p-4">
                <p className="text-sm font-semibold">Attendance Date</p>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-3xl mt-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Student Name</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-muted-foreground">Status</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {batch?.students.length ? (
              batch.students.map((student) => {
                const row = attendance[student._id];
                return (
                  <tr key={student._id} className="hover:bg-muted/30">
                    <td className="px-4 py-4">
                      <div className="font-semibold">{student.studentName}</div>
                      <div className="text-xs text-muted-foreground">{student.studentEmail}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student._id, "Present")}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                            row?.status === "Present"
                              ? "bg-success text-success-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student._id, "Absent")}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                            row?.status === "Absent"
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          <XCircle className="h-4 w-4" />
                          Absent
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Input
                        type="text"
                        placeholder="Add remark..."
                        value={row?.remark || ""}
                        onChange={(e) => handleRemarkChange(student._id, e.target.value)}
                        disabled={!row?.status}
                        className="rounded-3xl"
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No students allocated for this batch.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="rounded-3xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Marked: {selectedRows} • Present: {presentCount} • Absent: {absentCount}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={submitting || selectedRows === 0}
          className="rounded-3xl px-6 py-3"
        >
          {submitting ? "Submitting..." : "Submit Attendance"}
        </Button>
      </div>
    </div>
  );
}
