"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, Eye, Loader2, AlertCircle, Download, Bell, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  PaymentStatusBadge,
  PaymentModeBadge,
  PaymentModeSummary,
  getEnrollmentPaymentMode,
  filterCoursesByPaymentMode,
  type StudentPaymentMode,
} from "@/components/student/PaymentStatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InstallmentRow {
  installmentId: string;
  termNo: number;
  amount: number;
  dueDate: string;
  paidDate?: string;
  paymentStatus: string;
}

interface Enrollment {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  courseCode: string;
  enrollmentDate: string;
  status: 'active' | 'completed' | 'dropped';
  completionPercentage: number;
  paymentType?: string;
  totalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  amount?: number;
  paymentStatus?: string;
  paymentPlanStatus?: string;
  installments?: InstallmentRow[];
}

interface StudentEnrollments {
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseCount: number;
  courses: Enrollment[];
}

interface EnrollmentRow {
  student: StudentEnrollments;
  enrollment: Enrollment;
}

export default function EnrolledPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [studentEnrollments, setStudentEnrollments] = useState<StudentEnrollments[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "overdue">("all");
  const [paymentModeFilter, setPaymentModeFilter] = useState<"all" | StudentPaymentMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentEnrollments | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEnrollments();
  }, [filter]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const query = filter === "all" ? "" : `?filter=${filter}`;
      const res = await fetch(`/api/admin/enrollments${query}`, { credentials: 'include' });
      const data = await res.json();
      
      if (!res.ok) {
        const errorMsg = data?.details || data?.error || 'Failed to fetch enrollments';
        console.error('API Error:', { status: res.status, error: errorMsg, data });
        throw new Error(errorMsg);
      }
      setEnrollments(data.enrollments);

      // Group enrollments by student
      const grouped = new Map<string, StudentEnrollments>();
      data.enrollments.forEach((enrollment: Enrollment) => {
        if (!grouped.has(enrollment.studentId)) {
          grouped.set(enrollment.studentId, {
            studentId: enrollment.studentId,
            studentName: enrollment.studentName,
            studentEmail: enrollment.studentEmail,
            courseCount: 0,
            courses: [],
          });
        }
        const student = grouped.get(enrollment.studentId)!;
        student.courses.push(enrollment);
        student.courseCount = student.courses.length;
      });

      setStudentEnrollments(Array.from(grouped.values()).sort((a, b) => 
        a.studentName.localeCompare(b.studentName)
      ));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load enrollments';
      console.error('Error fetching enrollments:', errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewCourses = (student: StudentEnrollments, coursesOverride?: Enrollment[]) => {
    const courses = coursesOverride ?? filterCoursesByPaymentMode(student.courses, paymentModeFilter);
    setSelectedStudent({
      ...student,
      courses,
      courseCount: courses.length,
    });
    setShowModal(true);
  };

  const handleDownloadReport = async () => {
    try {
      const res = await fetch('/api/admin/enrollments?action=report', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Report download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'enrollment-report.csv';
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: 'Report downloaded' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to download report',
        variant: 'destructive',
      });
    }
  };

  const handleSendReminder = async (installmentId: string) => {
    setRemindingId(installmentId);
    try {
      const res = await fetch('/api/admin/enrollments/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ installmentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reminder');
      toast({ title: 'Reminder sent', description: 'Email reminder delivered to student.' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to send reminder',
        variant: 'destructive',
      });
    } finally {
      setRemindingId(null);
    }
  };

  const pendingCount = enrollments.filter(e =>
    ['pending', 'partially_paid', 'overdue'].includes(e.paymentPlanStatus ?? e.paymentStatus ?? '')
  ).length;
  const overdueCount = enrollments.filter(e => (e.paymentPlanStatus ?? '') === 'overdue').length;

  const filteredStudentEnrollments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return studentEnrollments.filter(student => {
      if (!query) return true;
      return (
        student.studentName.toLowerCase().includes(query) ||
        student.studentEmail.toLowerCase().includes(query) ||
        student.courses.some(
          c =>
            c.courseTitle.toLowerCase().includes(query) ||
            c.courseCode.toLowerCase().includes(query),
        )
      );
    });
  }, [studentEnrollments, searchQuery]);

  const filteredEnrollmentRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const rows: EnrollmentRow[] = [];

    for (const student of studentEnrollments) {
      for (const enrollment of student.courses) {
        const mode = getEnrollmentPaymentMode(enrollment);
        if (paymentModeFilter !== "all" && mode !== paymentModeFilter) continue;

        if (query) {
          const matches =
            student.studentName.toLowerCase().includes(query) ||
            student.studentEmail.toLowerCase().includes(query) ||
            enrollment.courseTitle.toLowerCase().includes(query) ||
            enrollment.courseCode.toLowerCase().includes(query);
          if (!matches) continue;
        }

        rows.push({ student, enrollment });
      }
    }

    return rows.sort((a, b) => {
      const byName = a.student.studentName.localeCompare(b.student.studentName);
      if (byName !== 0) return byName;
      return a.enrollment.courseTitle.localeCompare(b.enrollment.courseTitle);
    });
  }, [studentEnrollments, searchQuery, paymentModeFilter]);

  const isCourseLevelView = paymentModeFilter !== "all";
  const visibleRowCount = isCourseLevelView
    ? filteredEnrollmentRows.length
    : filteredStudentEnrollments.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enrolled Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage enrollments, installments, and payment reminders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadReport} className="gap-2">
            <Download className="h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by student name, email, or course..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'overdue'] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className="gap-1"
            >
              <Filter className="h-3 w-3" />
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Overdue'}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-medium text-muted-foreground self-center mr-1">Payment:</span>
        {(['all', 'full', 'partial'] as const).map(f => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={paymentModeFilter === f ? 'default' : 'outline'}
            onClick={() => setPaymentModeFilter(f)}
            aria-pressed={paymentModeFilter === f}
          >
            {f === 'all' ? 'All Payments' : f === 'full' ? 'Full Payment' : 'Partial Payment'}
          </Button>
        ))}
      </div>

      {paymentModeFilter !== "all" && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredEnrollmentRows.length} {paymentModeFilter === "full" ? "full payment" : "partial payment"} enrollment
          {filteredEnrollmentRows.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold">{studentEnrollments.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Enrollments</p>
              <p className="text-2xl font-bold">{enrollments.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">Pending Payments</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold">{overdueCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading enrollments...</p>
            </div>
          </div>
        ) : visibleRowCount === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-muted-foreground">
              {searchQuery || paymentModeFilter !== "all"
                ? "No enrollments match your search or filters"
                : "No enrollments found"}
            </p>
          </div>
        ) : isCourseLevelView ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Student Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Course</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">Payment Mode</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">Payment Status</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnrollmentRows.map(({ student, enrollment }, index) => (
                  <tr
                    key={enrollment.enrollmentId}
                    className={`border-b border-border ${
                      index % 2 === 0 ? 'bg-muted/30' : ''
                    } hover:bg-muted/50 transition-colors`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{student.studentName}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{student.studentEmail}</td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      <div className="font-medium">{enrollment.courseTitle}</div>
                      <div className="text-xs text-muted-foreground">{enrollment.courseCode}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <PaymentModeBadge mode={getEnrollmentPaymentMode(enrollment)} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <PaymentStatusBadge status={enrollment.paymentPlanStatus ?? enrollment.paymentStatus} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewCourses(student, [enrollment])}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Email
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">
                    Courses Enrolled
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-foreground min-w-[260px]">
                    Payment Breakdown
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudentEnrollments.map((student, index) => (
                  <tr
                    key={student.studentId}
                    className={`border-b border-border ${
                      index % 2 === 0 ? 'bg-muted/30' : ''
                    } hover:bg-muted/50 transition-colors`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-foreground align-top">
                      {student.studentName}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground align-top">
                      {student.studentEmail}
                    </td>
                    <td className="px-6 py-4 text-center align-top">
                      <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                        {student.courseCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <PaymentModeSummary courses={student.courses} modeFilter="all" />
                    </td>
                    <td className="px-6 py-4 text-center align-top">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewCourses(student)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Courses
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Courses Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedStudent?.studentName} - Enrolled Courses</DialogTitle>
            <DialogDescription>
              {selectedStudent?.studentEmail} has enrolled in{' '}
              {selectedStudent?.courseCount} course(s)
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-4 mt-4">
              {selectedStudent.courses.map((course) => (
                <div
                  key={course.enrollmentId}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Course Name</p>
                      <p className="text-sm font-semibold text-foreground">
                        {course.courseTitle}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Course Code</p>
                      <p className="text-sm font-semibold text-foreground">
                        {course.courseCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Enrollment Date</p>
                      <p className="text-sm font-semibold text-foreground">
                        {new Date(course.enrollmentDate).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className={`text-sm font-semibold ${
                        course.status === 'active'
                          ? 'text-green-600'
                          : course.status === 'completed'
                          ? 'text-blue-600'
                          : 'text-red-600'
                      }`}>
                        {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                      </p>
                    </div>
                    {course.paymentPlanStatus && (
                      <div>
                        <p className="text-xs text-muted-foreground">Payment Status</p>
                        <PaymentStatusBadge status={course.paymentPlanStatus} />
                      </div>
                    )}
                    {(course.paymentType || course.paymentPlanStatus) && (
                      <div>
                        <p className="text-xs text-muted-foreground">Payment Mode</p>
                        <PaymentModeBadge mode={getEnrollmentPaymentMode(course)} />
                      </div>
                    )}
                    {course.totalAmount != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Total / Paid / Remaining</p>
                        <p className="text-sm font-semibold">
                          ₹{course.totalAmount} / ₹{course.paidAmount ?? 0} / ₹{course.remainingAmount ?? 0}
                        </p>
                      </div>
                    )}
                  </div>
                  {course.installments && course.installments.length > 0 && (
                    <div className="mt-4 border-t border-border pt-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Installment Schedule</p>
                      {course.installments.map(inst => (
                        <div key={inst.installmentId} className="flex flex-wrap items-center justify-between gap-2 text-xs rounded-md bg-muted/40 px-3 py-2">
                          <span>Term {inst.termNo} · ₹{inst.amount} · Due {new Date(inst.dueDate).toLocaleDateString('en-IN')}</span>
                          <div className="flex items-center gap-2">
                            <PaymentStatusBadge status={inst.paymentStatus} />
                            {inst.paymentStatus !== 'paid' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={remindingId === inst.installmentId}
                                onClick={() => handleSendReminder(inst.installmentId)}
                              >
                                {remindingId === inst.installmentId ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Bell className="h-3 w-3 mr-1" />
                                    Remind
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
