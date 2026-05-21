"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

interface Student {
  _id: string;
  studentName: string;
  studentEmail: string;
  phone: string;
}

interface BatchData {
  _id: string;
  batchName: string;
  courseName: string;
  batchDay: string;
  batchTime: string;
  totalStudents: number;
  students: Student[];
}

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  status: "Present" | "Absent" | null;
  remark: string;
}

interface BatchAttendance {
  batchId: string;
  attendance: Record<string, AttendanceRecord>;
}

export function TeacherAttendancePage() {
  const { toast } = useToast();
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [batchAttendance, setBatchAttendance] = useState<Record<string, BatchAttendance>>({});
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Set default date to today
  useEffect(() => {
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];
    setSelectedDate(dateString);
  }, []);

  // Fetch batches
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/teacher/attendance/batches", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch batches");
        }

        const data = await response.json();
        setBatches(data.batches || []);

        // Initialize attendance state for all batches
        const initialAttendance: Record<string, BatchAttendance> = {};
        data.batches?.forEach((batch: BatchData) => {
          initialAttendance[batch._id] = {
            batchId: batch._id,
            attendance: {},
          };
          batch.students.forEach((student: Student) => {
            initialAttendance[batch._id].attendance[student._id] = {
              studentId: student._id,
              studentName: student.studentName,
              status: null,
              remark: "",
            };
          });
        });
        setBatchAttendance(initialAttendance);
      } catch (error) {
        console.error("Error fetching batches:", error);
        toast({
          title: "Error",
          description: "Failed to load batches. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, [toast]);

  // Fetch existing attendance when date changes
  const loadExistingAttendance = useCallback(
    async (batchId: string, date: string) => {
      try {
        const response = await fetch(
          `/api/teacher/attendance/by-date?batchId=${batchId}&date=${date}`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch attendance");
        }

        const data = await response.json();
        if (data.attendance) {
          // Load existing attendance
          const loadedAttendance: Record<string, AttendanceRecord> = {};
          data.attendance.students.forEach(
            (student: {
              studentId: string;
              studentName: string;
              status: "Present" | "Absent";
              remark?: string;
            }) => {
              loadedAttendance[student.studentId] = {
                studentId: student.studentId,
                studentName: student.studentName,
                status: student.status,
                remark: student.remark || "",
              };
            }
          );

          setBatchAttendance((prev) => ({
            ...prev,
            [batchId]: {
              batchId,
              attendance: loadedAttendance,
            },
          }));
        }
      } catch (error) {
        console.error("Error loading existing attendance:", error);
        // Silently fail - user can continue with fresh attendance
      }
    },
    []
  );

  // Handle date change
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    // Load existing attendance for all batches
    batches.forEach((batch) => {
      loadExistingAttendance(batch._id, date);
    });
  };

  // Toggle batch expansion
  const toggleBatchExpand = (batchId: string) => {
    setExpandedBatches((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  // Handle status change
  const handleStatusChange = (
    batchId: string,
    studentId: string,
    status: "Present" | "Absent"
  ) => {
    setBatchAttendance((prev) => ({
      ...prev,
      [batchId]: {
        ...prev[batchId],
        attendance: {
          ...prev[batchId].attendance,
          [studentId]: {
            ...prev[batchId].attendance[studentId],
            status,
          },
        },
      },
    }));
  };

  // Handle remark change
  const handleRemarkChange = (
    batchId: string,
    studentId: string,
    remark: string
  ) => {
    setBatchAttendance((prev) => ({
      ...prev,
      [batchId]: {
        ...prev[batchId],
        attendance: {
          ...prev[batchId].attendance,
          [studentId]: {
            ...prev[batchId].attendance[studentId],
            remark,
          },
        },
      },
    }));
  };

  // Handle submit
  const handleSubmitAttendance = async () => {
    try {
      setSubmitting(true);

      // Submit attendance for each batch
      for (const [batchId, batchData] of Object.entries(batchAttendance)) {
        const batch = batches.find((b) => b._id === batchId);
        if (!batch) continue;

        const students = Object.values(batchData.attendance)
          .filter((record) => record.status !== null) // Only include marked students
          .map((record) => ({
            studentId: record.studentId,
            studentName: record.studentName,
            studentEmail: batch.students.find((s) => s._id === record.studentId)?.studentEmail || "",
            phone: batch.students.find((s) => s._id === record.studentId)?.phone || "",
            status: record.status,
            remark: record.remark,
          }));

        if (students.length === 0) continue; // Skip if no students marked

        const response = await fetch("/api/teacher/attendance/save", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            batchId,
            batchName: batch.batchName,
            courseName: batch.courseName,
            date: selectedDate,
            students,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save attendance");
        }
      }

      toast({
        title: "Success",
        description: "Attendance submitted successfully",
      });
    } catch (error) {
      console.error("Error submitting attendance:", error);
      toast({
        title: "Error",
        description: "Failed to submit attendance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Loading batches...</p>
        </div>
      </div>
    );
  }

  const presentCount = Object.values(batchAttendance).reduce(
    (sum, batch) =>
      sum +
      Object.values(batch.attendance).filter((r) => r.status === "Present")
        .length,
    0
  );

  const absentCount = Object.values(batchAttendance).reduce(
    (sum, batch) =>
      sum +
      Object.values(batch.attendance).filter((r) => r.status === "Absent")
        .length,
    0
  );

  const totalMarked = presentCount + absentCount;

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mark Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select date and click on batch to mark attendance
          </p>
        </div>
      </div>

      {/* Date Selector and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="rounded-lg"
            />
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-success">
              Present
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{presentCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-destructive">
              Absent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{absentCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Batches */}
      {batches.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No batches assigned to you yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => {
            const isExpanded = expandedBatches.has(batch._id);
            
            return (
              <div key={batch._id}>
                {/* Batch Card Header - Clickable */}
                <Card
                  className="overflow-hidden cursor-pointer transition-all hover:shadow-md"
                  onClick={() => toggleBatchExpand(batch._id)}
                >
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{batch.batchName}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {batch.courseName} • {batch.batchDay} • {batch.batchTime}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-medium text-muted-foreground bg-background px-3 py-1 rounded-full">
                          {batch.totalStudents} students
                        </div>
                        <div className="text-muted-foreground">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Expanded Student List */}
                {isExpanded && (
                  <Card className="border-t-0 rounded-t-none">
                    <CardContent className="pt-4">
                      {batch.students.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">
                          No students allocated to this batch
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-2 font-semibold">
                                  Student Name
                                </th>
                                <th className="text-center py-2 px-2 font-semibold w-32">
                                  Status
                                </th>
                                <th className="text-left py-2 px-2 font-semibold flex-1 min-w-48">
                                  Remark
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {batch.students.map((student) => {
                                const record =
                                  batchAttendance[batch._id]?.attendance[student._id];
                                return (
                                  <tr key={student._id} className="border-b hover:bg-muted/50">
                                    <td className="py-3 px-2">
                                      <div className="font-medium">{student.studentName}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {student.studentEmail}
                                      </div>
                                    </td>
                                    <td className="py-3 px-2">
                                      <div className="flex gap-2 justify-center">
                                        <button
                                          onClick={() =>
                                            handleStatusChange(
                                              batch._id,
                                              student._id,
                                              "Present"
                                            )
                                          }
                                          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                            record?.status === "Present"
                                              ? "bg-success text-success-foreground shadow-md"
                                              : "bg-muted text-muted-foreground hover:bg-muted"
                                          }`}
                                        >
                                          <CheckCircle2 className="w-4 h-4" />
                                          Present
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleStatusChange(
                                              batch._id,
                                              student._id,
                                              "Absent"
                                            )
                                          }
                                          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                            record?.status === "Absent"
                                              ? "bg-destructive text-destructive-foreground shadow-md"
                                              : "bg-muted text-muted-foreground hover:bg-muted"
                                          }`}
                                        >
                                          <XCircle className="w-4 h-4" />
                                          Absent
                                        </button>
                                      </div>
                                    </td>
                                    <td className="py-3 px-2">
                                      <Input
                                        type="text"
                                        placeholder="Add remark..."
                                        value={record?.remark || ""}
                                        onChange={(e) =>
                                          handleRemarkChange(
                                            batch._id,
                                            student._id,
                                            e.target.value
                                          )
                                        }
                                        className="rounded-md text-xs h-8"
                                        disabled={record?.status === null}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Button */}
      {batches.length > 0 && (
        <div className="flex justify-end gap-3">
          <Button
            onClick={handleSubmitAttendance}
            disabled={submitting || totalMarked === 0}
            className="rounded-lg gradient-primary text-white border-0 shadow-pop min-w-48"
          >
            {submitting ? "Submitting..." : "Submit Attendance"}
          </Button>
        </div>
      )}
    </div>
  );
}
