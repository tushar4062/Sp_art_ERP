"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type StudentOption = {
  id: string;
  name: string;
  badgeId?: string;
  email?: string;
};

type CourseOption = {
  id: string;
  courseTitle: string;
  courseCode?: string;
};

type OfflinePaymentRow = {
  payment_id: string;
  reference_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  course_id: string;
  course_name: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  expected_payment_date: string;
  verified_at: string;
  hours_pending: number;
  is_overdue: boolean;
  notes: string;
};

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

function StatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  const normalized = status.toLowerCase();
  const statusClass = normalized === "pending"
    ? "bg-amber-100 text-amber-800"
    : normalized === "verified"
      ? "bg-emerald-100 text-emerald-800"
      : normalized === "rejected"
        ? "bg-rose-100 text-rose-800"
        : "bg-slate-100 text-slate-800";

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${statusClass}`}>
      <span>{status}</span>
      {overdue && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-white text-[10px]">Overdue</span>}
    </div>
  );
}

export default function AdminOfflinePaymentsPage() {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [payments, setPayments] = useState<OfflinePaymentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState({ total: 0, pending_count: 0, verified_count: 0, rejected_count: 0 });
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const loadStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/students", { credentials: "include" });
      const data = await res.json() as { students?: StudentOption[] };
      if (data.students) {
        setStudents(data.students);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load student list");
    }
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      const res = await fetch("/api/courses", { credentials: "include" });
      const data = await res.json() as { courses?: CourseOption[] };
      if (data.courses) {
        setCourses(data.courses);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load course list");
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/offline-payments?${params.toString()}`, { credentials: "include" });
      const data = await res.json() as {
        success?: boolean;
        payments?: Partial<OfflinePaymentRow>[];
        total?: number;
        pending_count?: number;
        verified_count?: number;
        rejected_count?: number;
        error?: string;
      };
      if (data?.success) {
        setPayments((data.payments ?? []).map(payment => ({
          payment_id: payment.payment_id || "",
          reference_id: payment.reference_id || "",
          student_id: payment.student_id || "",
          student_name: payment.student_name || "",
          student_email: payment.student_email || "",
          course_id: payment.course_id || "",
          course_name: payment.course_name || "",
          amount: payment.amount ?? 0,
          currency: payment.currency || "INR",
          payment_method: payment.payment_method || "",
          payment_status: payment.payment_status || "",
          created_at: payment.created_at || "",
          expected_payment_date: payment.expected_payment_date || "",
          verified_at: payment.verified_at || "",
          hours_pending: payment.hours_pending ?? 0,
          is_overdue: payment.is_overdue ?? false,
          notes: payment.notes || "",
        })));
        setSummary({
          total: data.total ?? 0,
          pending_count: data.pending_count ?? 0,
          verified_count: data.verified_count ?? 0,
          rejected_count: data.rejected_count ?? 0,
        });
      } else {
        console.error(data);
        toast.error(data?.error || "Failed to load offline payments");
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to fetch offline payments");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => {
    loadStudents();
    loadCourses();
    loadPayments();
  }, [loadStudents, loadCourses, loadPayments]);

  const refresh = async () => {
    await loadPayments();
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!studentId || !courseId) {
      toast.error("Select a student and course before creating a request");
      return;
    }

    const amountNumber = Number(amount);
    if (!amountNumber || amountNumber <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/offline-payments/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          course_id: courseId,
          amount: amountNumber,
          payment_method: paymentMethod,
          expected_payment_date: expectedDate || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        toast.success("Offline payment request created");
        setAmount("");
        setExpectedDate("");
        setNotes("");
        await loadPayments();
      } else {
        toast.error(data?.error || "Unable to create request");
      }
    } catch (error) {
      console.error(error);
      toast.error("Create request failed");
    } finally {
      setSaving(false);
    }
  };

  const verifyPayment = useCallback(async (paymentId: string) => {
    const confirmed = window.confirm("Verify this offline payment and grant course access?");
    if (!confirmed) return;

    try {
      const formData = new FormData();
      formData.append("verification_status", "verified");
      formData.append("verification_notes", "Verified by admin via offline payments page");
      const res = await fetch(`/api/admin/offline-payments/${paymentId}/verify`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        toast.success("Payment verified successfully");
        await loadPayments();
      } else {
        toast.error(data?.error || "Verification failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to verify payment");
    }
  }, [loadPayments]);

  const rejectPayment = useCallback(async (paymentId: string) => {
    const reason = window.prompt("Enter rejection reason for this payment:");
    if (!reason || !reason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    try {
      const res = await fetch(`/api/admin/offline-payments/${paymentId}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejection_reason: reason.trim() }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        toast.success("Payment rejected successfully");
        await loadPayments();
      } else {
        toast.error(data?.error || "Rejection failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to reject payment");
    }
  }, [loadPayments]);

  const tableColumns = useMemo(
    () => [
      { key: "reference_id", header: "Reference" },
      { key: "student_name", header: "Student" },
      { key: "course_name", header: "Course" },
      { key: "amount", header: "Amount", render: (row: OfflinePaymentRow) => `₹${row.amount.toLocaleString()}` },
      { key: "payment_method", header: "Method", render: (row: OfflinePaymentRow) => row.payment_method.replace("_", " ") },
      { key: "payment_status", header: "Status", render: (row: OfflinePaymentRow) => <StatusBadge status={row.payment_status} overdue={row.is_overdue} /> },
      { key: "created_at", header: "Created", render: (row: OfflinePaymentRow) => row.created_at ? format(new Date(row.created_at), "dd MMM yyyy") : "—" },
      { key: "actions", header: "Actions", render: (row: OfflinePaymentRow) => (
          row.payment_status === "pending"
            ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => verifyPayment(row.payment_id)}>Verify</Button>
                <Button size="sm" variant="outline" onClick={() => rejectPayment(row.payment_id)}>Reject</Button>
              </div>
            )
            : <span className="text-sm text-muted-foreground">No actions</span>
        ),
      },
    ],
    [rejectPayment, verifyPayment],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Offline Payments" subtitle="Create and review offline payment requests" action={
        <Button variant="secondary" onClick={refresh} disabled={loading}>Refresh</Button>
      } />

      <section className="card-soft p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Create offline payment request</h2>
          <p className="text-sm text-muted-foreground">Submit a pending offline payment for a student and course.</p>
        </div>

        <form className="space-y-4" onSubmit={handleCreate}>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[220px] flex-1">
              <label className="mb-2 block text-sm font-medium text-slate-700">Student</label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger className="h-12 rounded-2xl border border-border/70 bg-white shadow-sm">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} {student.badgeId ? `(${student.badgeId})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[220px] flex-1">
              <label className="mb-2 block text-sm font-medium text-slate-700">Course</label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="h-12 rounded-2xl border border-border/70 bg-white shadow-sm">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.courseTitle} {course.courseCode ? `(${course.courseCode})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[160px] flex-1 sm:flex-none sm:w-32">
              <label className="mb-2 block text-sm font-medium text-slate-700">Amount (₹)</label>
              <Input className="h-12 rounded-2xl border border-border/70 bg-white shadow-sm" value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1" placeholder="Amount" />
            </div>

            <div className="min-w-[180px] flex-1 sm:flex-none sm:w-44">
              <label className="mb-2 block text-sm font-medium text-slate-700">Payment method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-12 rounded-2xl border border-border/70 bg-white shadow-sm">
                  <SelectValue placeholder="Payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[180px] flex-1 sm:flex-none sm:w-44">
              <label className="mb-2 block text-sm font-medium text-slate-700">Expected payment date</label>
              <Input className="h-12 rounded-2xl border border-border/70 bg-white shadow-sm" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} type="date" />
            </div>

            <div className="min-w-[180px] flex-none self-end">
              <Button type="submit" className="h-12 rounded-2xl px-6" disabled={saving}>{saving ? "Saving..." : "Create request"}</Button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Notes</label>
            <Textarea className="min-h-[120px] rounded-2xl border border-border/70 bg-white p-4 shadow-sm" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Details, branch, reference, or other instructions" />
          </div>
        </form>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-3xl border border-border/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="mt-2 text-3xl font-semibold">{summary.pending_count}</p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <p className="text-sm text-muted-foreground">Verified</p>
          <p className="mt-2 text-3xl font-semibold">{summary.verified_count}</p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <p className="text-sm text-muted-foreground">Rejected</p>
          <p className="mt-2 text-3xl font-semibold">{summary.rejected_count}</p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="mt-2 text-3xl font-semibold">{summary.total}</p>
        </div>
      </section>

      <section className="card-soft p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">Recent offline payments</h3>
            <p className="text-sm text-muted-foreground">Filter and audit pending activity.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-12 rounded-2xl border border-border/70 bg-white shadow-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="h-12 rounded-2xl border border-border/70 bg-white shadow-sm"
              placeholder="Search reference, student, course"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Button variant="outline" className="h-12 rounded-2xl" onClick={loadPayments}>Apply</Button>
          </div>
        </div>

        <DataTable
          columns={tableColumns}
          rows={payments}
          searchKeys={['reference_id', 'student_name', 'course_name', 'payment_method', 'payment_status', 'notes']}
          emptyMessage={loading ? "Loading payments..." : "No offline payments found"}
        />
      </section>
    </div>
  );
}
