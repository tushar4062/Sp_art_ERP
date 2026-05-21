"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, Pencil, Save, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";

export type SeniorTeacherStudentItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  age: number | null;
  course: string;
  className: string;
  parentName: string;
  parentContact: string;
  address: string;
  profileImage: string;
  status: "Active" | "Inactive";
  attendancePercentage: number;
  joiningDate: string;
};

type StudentFormState = {
  fullName: string;
  phone: string;
  gender: string;
  age: string;
  course: string;
  className: string;
  parentName: string;
  parentContact: string;
  address: string;
  status: "Active" | "Inactive";
};

function studentToForm(s: SeniorTeacherStudentItem): StudentFormState {
  return {
    fullName: s.fullName,
    phone: s.phone,
    gender: s.gender || "",
    age: s.age != null ? String(s.age) : "",
    course: s.course,
    className: s.className,
    parentName: s.parentName,
    parentContact: s.parentContact,
    address: s.address,
    status: s.status,
  };
}

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-24 hidden sm:block" />
          <Skeleton className="h-8 w-20 hidden md:block" />
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

export function SeniorTeacherStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<SeniorTeacherStudentItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterClass, setFilterClass] = useState("All");
  const [filterCourse, setFilterCourse] = useState("All");
  const [filterGender, setFilterGender] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<SeniorTeacherStudentItem | null>(null);
  const [form, setForm] = useState<StudentFormState | null>(null);
  const [sheetMode, setSheetMode] = useState<"view" | "edit">("view");
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterStatus, filterClass, filterCourse, filterGender]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        search: debouncedSearch,
        status: filterStatus,
        class: filterClass,
        course: filterCourse,
        gender: filterGender,
      });
      const res = await fetch(`/api/senior-teacher/students?${params}`, { credentials: "include" });
      const json = await parseJsonResponse<{
        error?: string;
        data?: {
          students: SeniorTeacherStudentItem[];
          pagination: Pagination;
          filterOptions?: { classes?: string[]; courses?: string[] };
        };
      }>(res);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to load students");
      if (!json.data?.students) throw new Error("Invalid students response from server");
      setStudents(json.data.students);
      setPagination(json.data.pagination);
      setClassOptions(json.data.filterOptions?.classes ?? []);
      setCourseOptions(json.data.filterOptions?.courses ?? []);
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to load students"));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterStatus, filterClass, filterCourse, filterGender, router]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const loadStudent = async (id: string, mode: "view" | "edit") => {
    setSheetLoading(true);
    setSheetOpen(true);
    setSheetMode(mode);
    setSelectedStudent(null);
    setForm(null);
    try {
      const res = await fetch(`/api/senior-teacher/students/${id}`, { credentials: "include" });
      const json = await parseJsonResponse<{ error?: string; data?: { student: SeniorTeacherStudentItem } }>(res);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to load student");
      const s = json.data.student as SeniorTeacherStudentItem;
      setSelectedStudent(s);
      setForm(studentToForm(s));
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to load student"));
      setSheetOpen(false);
    } finally {
      setSheetLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedStudent || !form) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/senior-teacher/students/${selectedStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          gender: form.gender || undefined,
          age: form.age ? Number(form.age) : undefined,
          course: form.course.trim(),
          className: form.className.trim(),
          parentName: form.parentName.trim(),
          parentContact: form.parentContact.trim(),
          address: form.address.trim(),
          status: form.status,
        }),
      });
      const json = await parseJsonResponse<{
        error?: string;
        message?: string;
        data?: { student: SeniorTeacherStudentItem };
      }>(res);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Save failed");
      toast.success(json.message || "Student updated");
      const s = json.data.student as SeniorTeacherStudentItem;
      setSelectedStudent(s);
      setForm(studentToForm(s));
      setSheetMode("view");
      fetchStudents();
    } catch (e) {
      toast.error(messageFromUnknown(e, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const pageNumbers = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle={
          loading
            ? "Loading registered students…"
            : `${pagination.total} total registered student${pagination.total === 1 ? "" : "s"}`
        }
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5 items-center">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-11 rounded-2xl"
              placeholder="Search by name, email, class, or course..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="rounded-2xl w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="rounded-2xl w-full">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All classes</SelectItem>
              {classOptions.map(c => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="rounded-2xl w-full">
              <SelectValue placeholder="All courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All courses</SelectItem>
              {courseOptions.map(c => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterGender} onValueChange={setFilterGender}>
            <SelectTrigger className="rounded-2xl w-full">
              <SelectValue placeholder="All genders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All genders</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : students.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-lg font-display font-semibold text-foreground">No students found</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {pagination.total === 0 && !debouncedSearch && filterStatus === "All"
                ? "No students in the students collection yet. Add via Admin or set createdBy in MongoDB."
                : "Try adjusting your search or filters to find students."}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Profile Photo
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Student Name
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Email
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Course
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Class
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Attendance
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Status
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Joining Date
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {students.map(student => (
                    <TableRow key={student.id} className="border-0 hover:bg-slate-50 transition-colors">
                      <TableCell className="px-6 py-5">
                        <Avatar name={student.fullName} src={student.profileImage} size={40} />
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="font-semibold text-slate-900">{student.fullName}</div>
                      </TableCell>
                      <TableCell className="px-6 py-5 text-slate-700">{student.email}</TableCell>
                      <TableCell className="px-6 py-5 text-slate-700">{student.course}</TableCell>
                      <TableCell className="px-6 py-5 text-slate-700">{student.className}</TableCell>
                      <TableCell className="px-6 py-5 text-slate-700">{student.attendancePercentage}%</TableCell>
                      <TableCell className="px-6 py-5">
                        <StatusBadge status={student.status} />
                      </TableCell>
                      <TableCell className="px-6 py-5 text-slate-700">{student.joiningDate || "—"}</TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs"
                            onClick={() => loadStudent(student.id, "view")}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 px-3 text-xs"
                            onClick={() => loadStudent(student.id, "edit")}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {students.map(student => (
                <div key={student.id} className="p-4 space-y-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar name={student.fullName} src={student.profileImage} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{student.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                    </div>
                    <StatusBadge status={student.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                    <div>
                      <span className="text-muted-foreground text-xs">Course</span>
                      <p className="font-medium">{student.course}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Class</span>
                      <p className="font-medium">{student.className}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Attendance</span>
                      <p className="font-medium">{student.attendancePercentage}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Joined</span>
                      <p className="font-medium">{student.joiningDate || "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => loadStudent(student.id, "view")}>
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => loadStudent(student.id, "edit")}>
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {pagination.totalPages > 0 && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 px-4 py-4">
                <span className="text-sm text-slate-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} students
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  {pageNumbers.map(n => (
                    <Button
                      key={n}
                      variant={n === page ? "default" : "outline"}
                      size="sm"
                      className="min-w-9"
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheetMode === "edit" ? "Edit student" : "Student details"}</SheetTitle>
          </SheetHeader>
          {sheetLoading || !selectedStudent || !form ? (
            <div className="space-y-4 py-6">
              <Skeleton className="h-20 w-20 rounded-full mx-auto" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : sheetMode === "view" ? (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center gap-3">
                <Avatar name={selectedStudent.fullName} src={selectedStudent.profileImage} size={80} />
                <div className="text-center">
                  <h2 className="font-display text-xl font-bold">{selectedStudent.fullName}</h2>
                  <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                  <div className="mt-2">
                    <StatusBadge status={selectedStudent.status} />
                  </div>
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border border-border p-4 bg-muted/20">
                <DetailRow label="Phone" value={selectedStudent.phone} />
                <DetailRow label="Gender" value={selectedStudent.gender} />
                <DetailRow label="Age" value={selectedStudent.age != null ? String(selectedStudent.age) : ""} />
                <DetailRow label="Course" value={selectedStudent.course} />
                <DetailRow label="Class" value={selectedStudent.className} />
                <DetailRow label="Joining date" value={selectedStudent.joiningDate} />
                <DetailRow label="Parent name" value={selectedStudent.parentName} />
                <DetailRow label="Parent contact" value={selectedStudent.parentContact} />
                <DetailRow label="Address" value={selectedStudent.address} />
              </div>
              <Button className="w-full rounded-xl" onClick={() => setSheetMode("edit")}>
                <Pencil className="w-4 h-4 mr-2" /> Edit student
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Email (read-only)</Label>
                <Input value={selectedStudent.email} disabled className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as "Active" | "Inactive" })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={form.gender || "unset"} onValueChange={v => setForm({ ...form, gender: v === "unset" ? "" : v })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not set</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Course</Label>
                  <Input value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Input value={form.className} onChange={e => setForm({ ...form, className: e.target.value })} className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Parent name</Label>
                <Input value={form.parentName} onChange={e => setForm({ ...form, parentName: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Parent contact</Label>
                <Input value={form.parentContact} onChange={e => setForm({ ...form, parentContact: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="rounded-xl" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setSheetMode("view")} disabled={saving}>
                  Cancel
                </Button>
                <Button className="flex-1 rounded-xl gradient-primary text-white border-0" onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-1" />
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
