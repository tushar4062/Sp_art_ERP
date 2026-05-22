"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertCircle, ChevronLeft, Eye, FileText, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

type StudentAttendanceStatus = "Present" | "Absent" | "Unmarked";

interface AttendanceHistoryEntry {
  date: string;
  status: StudentAttendanceStatus;
  remark?: string;
}

interface AttendanceHistorySummary {
  present: number;
  absent: number;
  totalDays: number;
  percentage: number;
}

export default function BatchAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const batchId = Array.isArray(params?.batchId) ? params?.batchId[0] : params?.batchId;
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<BatchStudent | null>(null);
  const [historyMonth, setHistoryMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [historyEntries, setHistoryEntries] = useState<AttendanceHistoryEntry[]>([]);
  const [historySummary, setHistorySummary] = useState<AttendanceHistorySummary | null>(null);

  useEffect(() => {
    if (!batchId) return;

    const fetchBatch = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/teacher/attendance/${batchId}`, {
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load batch.";
        console.error(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBatch();
  }, [batchId, toast]);

  useEffect(() => {
    if (!historyOpen || !batchId || !selectedStudent) return;

    const loadHistory = async () => {
      try {
        setHistoryLoading(true);
        const response = await fetch(
          `/api/teacher/attendance/history?batchId=${encodeURIComponent(batchId)}&studentId=${encodeURIComponent(
            selectedStudent._id,
          )}&month=${encodeURIComponent(historyMonth)}`,
          {
            method: "GET",
            credentials: "include",
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Unable to load attendance history");
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to load attendance history");
        }

        setHistoryEntries(data.records ?? []);
        setHistorySummary({
          present: data.summary.present,
          absent: data.summary.absent,
          totalDays: data.summary.totalDays,
          percentage: data.summary.percentage,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load attendance history.";
        console.error(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, [batchId, historyMonth, historyOpen, selectedStudent, toast]);

  const openHistory = (student: BatchStudent) => {
    setSelectedStudent(student);
    setHistoryMonth(new Date().toISOString().slice(0, 7));
    setHistoryOpen(true);
  };

  const closeHistory = () => {
    setHistoryOpen(false);
    setSelectedStudent(null);
    setHistoryEntries([]);
    setHistorySummary(null);
  };

  const historyMap = useMemo(() => {
    return historyEntries.reduce<Record<string, StudentAttendanceStatus>>((acc, entry) => {
      acc[entry.date] = entry.status;
      return acc;
    }, {});
  }, [historyEntries]);

  const historyMonthDays = useMemo(() => {
    const [year, month] = historyMonth.split("-").map(Number);
    const days = new Date(year, month, 0).getDate();
    return Array.from({ length: days }, (_, index) => index + 1);
  }, [historyMonth]);

  const monthLabel = useMemo(() => {
    const [year, month] = historyMonth.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
  }, [historyMonth]);

  const formatStatusLabel = (status: StudentAttendanceStatus) => {
    if (status === "Present") return "P";
    if (status === "Absent") return "A";
    return "-";
  };

  const getStatusClasses = (status: StudentAttendanceStatus) => {
    switch (status) {
      case "Present":
        return "bg-emerald-500 text-white";
      case "Absent":
        return "bg-destructive text-white";
      default:
        return "bg-slate-200 text-slate-700";
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
      <div className="flex items-center">
        <Button variant="ghost" onClick={() => router.push("/teacher/attendance") }>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to batches
        </Button>
      </div>

      <div className="space-y-4">
        <div className="px-1 py-1 sm:px-2 sm:py-2">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900">{batch?.batchName}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{batch?.courseName}</p>
        </div>

        <Card className="rounded-3xl border border-border bg-background">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Student Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-3xl border border-border bg-white shadow-sm">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Student Name</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-muted-foreground">Roll No</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-muted-foreground">Attendance Record</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {batch?.students.length ? (
                    batch.students.map((student, index) => (
                      <tr key={student._id} className="hover:bg-muted/30">
                        <td className="px-4 py-4">
                          <div className="font-semibold">{student.studentName}</div>
                          <div className="text-xs text-muted-foreground">{student.studentEmail}</div>
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-muted-foreground">{index + 1}</td>
                        <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                          View monthly attendance history for this student.
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button variant="outline" size="sm" onClick={() => openHistory(student)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Attendance
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No students allocated for this batch.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="w-full max-w-3xl sm:max-w-4xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Monthly attendance</DialogTitle>
            <DialogDescription>
              {selectedStudent?.studentName} • {monthLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-muted/10 p-4">
              <p className="text-sm font-semibold">Selected student</p>
              <p className="text-base font-medium">{selectedStudent?.studentName}</p>
              <p className="text-sm text-muted-foreground">{selectedStudent?.studentEmail}</p>
            </div>
            <div className="rounded-3xl bg-muted/10 p-4">
              <p className="text-sm font-semibold">Month</p>
              <Input
                type="month"
                value={historyMonth}
                onChange={(e) => setHistoryMonth(e.target.value)}
                className="mt-2 rounded-3xl"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-slate-950 p-4 text-white">
              <p className="text-sm uppercase text-slate-400">Present</p>
              <p className="text-2xl font-semibold">{historySummary?.present ?? 0}</p>
            </div>
            <div className="rounded-3xl bg-rose-600/10 p-4 text-rose-700">
              <p className="text-sm uppercase text-rose-500">Absent</p>
              <p className="text-2xl font-semibold">{historySummary?.absent ?? 0}</p>
            </div>
            <div className="rounded-3xl bg-emerald-600/10 p-4 text-emerald-700">
              <p className="text-sm uppercase text-emerald-500">Attendance %</p>
              <p className="text-2xl font-semibold">{historySummary ? `${historySummary.percentage.toFixed(0)}%` : "0%"}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Present
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Absent
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> No record
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print() }>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print() }>
                <FileText className="mr-2 h-4 w-4" /> Export PDF
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {historyMonthDays.map((day) => {
              const dateKey = `${historyMonth}-${String(day).padStart(2, "0")}`;
              const status = historyMap[dateKey] ?? "Unmarked";
              return (
                <div
                  key={dateKey}
                  className={`min-h-[60px] rounded-3xl border border-border p-2 ${getStatusClasses(status)}`}
                >
                  <div className="text-sm font-semibold">{day}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.12em]">{formatStatusLabel(status)}</div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="mt-6 flex justify-end">
            <Button variant="ghost" onClick={closeHistory}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
