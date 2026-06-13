'use client';

import { useState, useEffect } from 'react';
import { BookOpen, AlertCircle, Loader2, GraduationCap, Calendar, Trophy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { PaymentSummaryCard } from '@/components/student/PaymentSummaryCard';
import { PaymentStatusBadge } from '@/components/student/PaymentStatusBadge';

interface EnrolledCourse {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  courseCode: string;
  instructor: string;
  image?: string;
  duration: number;
  status: 'active' | 'completed' | 'dropped';
  enrollmentDate: string;
  completionPercentage: number;
  totalFees: number;
  discountFees?: number;
  discountPercentage: number;
  paymentType?: string;
  baseAmount?: number;
  gstAmount?: number;
  installmentCharge?: number;
  totalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  amount?: number;
  paymentStatus?: string;
  paymentPlanStatus?: string;
  nextDueDate?: string | null;
  nextTermNo?: number | null;
  installments?: Array<{
    termNo: number;
    amount: number;
    dueDate: string;
    paidDate?: string;
    paymentStatus: string;
  }>;
  paymentHistory?: Array<{
    paymentDate: string;
    paymentId: string;
    amount: number;
    termNo: number;
    status: string;
  }>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'completed':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'dropped':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getCategoryColor = (percentage: number) => {
  if (percentage >= 75) return 'from-emerald-400 to-emerald-600';
  if (percentage >= 50) return 'from-blue-400 to-blue-600';
  if (percentage >= 25) return 'from-amber-400 to-amber-600';
  return 'from-slate-400 to-slate-600';
};

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingCourseId, setDownloadingCourseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/student/enrolled-courses', {
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch courses');
      }

      setCourses(data.enrolledCourses || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load courses';
      setError(message);
      console.error('Error fetching enrolled courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (courseId: string) => {
    if (!courseId) {
      toast({ title: 'Invoice unavailable', description: 'Unable to identify the invoice for this course.', variant: 'destructive' });
      return;
    }

    setDownloadingCourseId(courseId);
    try {
      const res = await fetch(`/api/invoice/download/${courseId}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Unable to download invoice');
      }

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] || `invoice-${courseId}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: 'Invoice downloaded', description: 'Your invoice is ready.', variant: 'default' });
    } catch (err) {
      console.error('Download invoice failed:', err);
      toast({ title: 'Download error', description: err instanceof Error ? err.message : 'Unable to download invoice.', variant: 'destructive' });
    } finally {
      setDownloadingCourseId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Courses</h1>
            <p className="text-slate-600 mt-0.5">Manage your enrolled courses</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-white rounded-full shadow-lg mb-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <p className="text-slate-600 font-medium">Loading your courses...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error Loading Courses</h3>
            <p className="text-red-800 text-sm mt-1">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchEnrolledCourses} className="flex-shrink-0">
            Retry
          </Button>
        </div>
      )}

      {!loading && courses.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm">
          <div className="p-4 bg-blue-100 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No Courses Yet</h2>
          <p className="text-slate-600 text-center max-w-md mb-6">
            You have not enrolled in any courses yet. Explore our course catalog and start learning!
          </p>
          <Link href="/student/courses">
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
              Explore Courses
            </Button>
          </Link>
        </div>
      )}

      {!loading && courses.length > 0 && (
        <div className="space-y-6">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{courses.length}</span> enrolled course{courses.length !== 1 ? 's' : ''}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.enrollmentId}
                className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 hover:border-blue-200"
              >
                <div className={`h-40 bg-gradient-to-br ${getCategoryColor(course.completionPercentage)} relative overflow-hidden flex items-center justify-center`}>
                  {course.image ? (
                    <img
                      src={course.image}
                      alt={course.courseTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-white">
                      <GraduationCap className="w-12 h-12 mb-2 opacity-60" />
                      <p className="text-xs font-medium opacity-60">No Image</p>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(course.status)}`}>
                      {getStatusLabel(course.status)}
                    </span>
                    <PaymentStatusBadge status={course.paymentPlanStatus ?? course.paymentStatus} />
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {course.courseTitle}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Code: {course.courseCode}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700 truncate">{course.instructor}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-slate-600">
                      {new Date(course.enrollmentDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">Progress</span>
                      <span className="text-xs font-bold text-blue-600">{course.completionPercentage}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                        style={{ width: `${course.completionPercentage}%` }}
                      />
                    </div>
                  </div>

                  <PaymentSummaryCard
                    enrollmentId={course.enrollmentId}
                    courseId={course.courseId}
                    courseTitle={course.courseTitle}
                    baseFee={course.discountFees ?? course.baseAmount ?? course.totalFees}
                    duration={course.duration}
                    paymentType={course.paymentType ?? 'full'}
                    totalAmount={course.totalAmount ?? course.amount ?? 0}
                    gstAmount={course.gstAmount ?? 0}
                    installmentCharge={course.installmentCharge ?? 0}
                    paidAmount={course.paidAmount ?? course.amount ?? 0}
                    remainingAmount={course.remainingAmount ?? 0}
                    paymentPlanStatus={course.paymentPlanStatus}
                    nextDueDate={course.nextDueDate}
                    nextTermNo={course.nextTermNo}
                    installments={course.installments}
                    paymentHistory={course.paymentHistory}
                    onPaymentSuccess={fetchEnrolledCourses}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link href={`/student/courses/${course.courseId}`} className="block">
                      <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 hover:shadow-lg">
                        <Trophy className="w-4 h-4 mr-2" />
                        View Course
                      </Button>
                    </Link>
                    <Button
                      className="w-full rounded-[22px] bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold py-3 transition transform duration-300 ease-out hover:from-sky-600 hover:to-blue-700 hover:-translate-y-0.5"
                      onClick={() => handleDownloadInvoice(course.courseId)}
                      disabled={downloadingCourseId === course.courseId}
                    >
                      {downloadingCourseId === course.courseId ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <Download className="h-4 w-4" />
                          <span>Invoice</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
