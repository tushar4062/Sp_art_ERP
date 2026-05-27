"use client";

import { useState, useEffect } from "react";
import { Users, Eye, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  amount?: number;
  paymentStatus?: string;
}

interface StudentEnrollments {
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseCount: number;
  courses: Enrollment[];
}

export default function EnrolledPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [studentEnrollments, setStudentEnrollments] = useState<StudentEnrollments[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentEnrollments | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/enrollments', { credentials: 'include' });
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

  const handleViewCourses = (student: StudentEnrollments) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enrolled Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student course enrollments
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
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
            <Eye className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Avg Courses/Student</p>
              <p className="text-2xl font-bold">
                {studentEnrollments.length > 0
                  ? (enrollments.length / studentEnrollments.length).toFixed(1)
                  : 0}
              </p>
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
        ) : studentEnrollments.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-muted-foreground">No enrollments found</p>
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
                  <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {studentEnrollments.map((student, index) => (
                  <tr
                    key={student.studentId}
                    className={`border-b border-border ${
                      index % 2 === 0 ? 'bg-muted/30' : ''
                    } hover:bg-muted/50 transition-colors`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {student.studentName}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {student.studentEmail}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                        {student.courseCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
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
                    {course.amount && (
                      <div>
                        <p className="text-xs text-muted-foreground">Amount Paid</p>
                        <p className="text-sm font-semibold text-foreground">
                          ₹{course.amount.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {course.paymentStatus && (
                      <div>
                        <p className="text-xs text-muted-foreground">Payment Status</p>
                        <p className={`text-sm font-semibold ${
                          course.paymentStatus === 'completed'
                            ? 'text-green-600'
                            : course.paymentStatus === 'pending'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}>
                          {course.paymentStatus.charAt(0).toUpperCase() +
                            course.paymentStatus.slice(1)}
                        </p>
                      </div>
                    )}
                  </div>
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
