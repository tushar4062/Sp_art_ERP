"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, Pencil, Save, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export type SeniorTeacherTeacherItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  age: number | null;
  specialization: string;
  subject: string;
  experience: number;
  qualification: string;
  joiningDate: string;
  address: string;
  profileImage: string;
  salary: number | null;
  status: "Active" | "Inactive";
  teacherId: string;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

type FormState = {
  fullName: string;
  phone: string;
  gender: string;
  age: string;
  specialization: string;
  subject: string;
  experience: string;
  qualification: string;
  joiningDate: string;
  address: string;
  salary: string;
  status: "Active" | "Inactive";
};

function teacherToForm(t: SeniorTeacherTeacherItem): FormState {
  return {
    fullName: t.fullName,
    phone: t.phone,
    gender: t.gender || "",
    age: t.age != null ? String(t.age) : "",
    specialization: t.specialization,
    subject: t.subject,
    experience: String(t.experience ?? 0),
    qualification: t.qualification,
    joiningDate: t.joiningDate,
    address: t.address,
    salary: t.salary != null ? String(t.salary) : "",
    status: t.status,
  };
}

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

const EXPERIENCE_FILTERS = [
  { value: "All", label: "All experience" },
  { value: "0-2", label: "0–2 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "6+", label: "6+ years" },
];

export function SeniorTeacherTeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<SeniorTeacherTeacherItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [specializationOptions, setSpecializationOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterSpecialization, setFilterSpecialization] = useState("All");
  const [filterGender, setFilterGender] = useState("All");
  const [filterExperience, setFilterExperience] = useState("All");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"view" | "edit">("view");
  const [selectedTeacher, setSelectedTeacher] = useState<SeniorTeacherTeacherItem | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterStatus, filterSubject, filterSpecialization, filterGender, filterExperience]);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        search: debouncedSearch,
        status: filterStatus,
        subject: filterSubject,
        specialization: filterSpecialization,
        gender: filterGender,
        experience: filterExperience,
      });
      const res = await fetch(`/api/senior-teacher/teachers?${params}`, { credentials: "include" });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to load teachers");
      setTeachers(json.data.teachers);
      setPagination(json.data.pagination);
      setSubjectOptions(json.data.filterOptions?.subjects ?? []);
      setSpecializationOptions(json.data.filterOptions?.specializations ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    debouncedSearch,
    filterStatus,
    filterSubject,
    filterSpecialization,
    filterGender,
    filterExperience,
    router,
  ]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const loadTeacher = async (id: string, mode: "view" | "edit") => {
    setSheetLoading(true);
    setSheetOpen(true);
    setSheetMode(mode);
    setSelectedTeacher(null);
    setForm(null);
    try {
      const res = await fetch(`/api/senior-teacher/teachers/${id}`, { credentials: "include" });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to load teacher");
      const t = json.data.teacher as SeniorTeacherTeacherItem;
      setSelectedTeacher(t);
      setForm(teacherToForm(t));
    } catch (e) {
      toast.error((e as Error).message);
      setSheetOpen(false);
    } finally {
      setSheetLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTeacher || !form) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/senior-teacher/teachers/${selectedTeacher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          ...(form.gender ? { gender: form.gender } : { gender: "" }),
          age: form.age ? Number(form.age) : 0,
          specialization: form.specialization.trim(),
          subject: form.subject.trim(),
          experience: Number(form.experience) || 0,
          qualification: form.qualification.trim(),
          joiningDate: form.joiningDate,
          address: form.address.trim(),
          salary: form.salary ? Number(form.salary) : 0,
          status: form.status,
        }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Save failed");
      toast.success(json.message || "Teacher updated");
      const t = json.data.teacher as SeniorTeacherTeacherItem;
      setSelectedTeacher(t);
      setForm(teacherToForm(t));
      setSheetMode("view");
      fetchTeachers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const pageNumbers = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teachers"
        subtitle={
          loading
            ? "Loading registered teachers…"
            : `${pagination.total} total registered teacher${pagination.total === 1 ? "" : "s"}`
        }
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-6 items-center">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-11 rounded-2xl"
              placeholder="Search by name, email, specialization, or subject..."
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

          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="rounded-2xl w-full">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All subjects</SelectItem>
              {subjectOptions.map(s => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterSpecialization} onValueChange={setFilterSpecialization}>
            <SelectTrigger className="rounded-2xl w-full">
              <SelectValue placeholder="All specializations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All specializations</SelectItem>
              {specializationOptions.map(s => (
                <SelectItem key={s} value={s}>
                  {s}
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

          <Select value={filterExperience} onValueChange={setFilterExperience}>
            <SelectTrigger className="rounded-2xl w-full">
              <SelectValue placeholder="Experience" />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_FILTERS.map(f => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : teachers.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-lg font-display font-semibold text-foreground">No teachers found</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {pagination.total === 0 && !debouncedSearch && filterStatus === "All"
                ? "No teachers are registered under your account yet."
                : "Try adjusting your search or filters."}
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
                      Teacher Name
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Email
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Subject
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Specialization
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Experience
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
                  {teachers.map(teacher => (
                    <TableRow key={teacher.id} className="border-0 hover:bg-slate-50 transition-colors">
                      <TableCell className="px-6 py-5">
                        <Avatar name={teacher.fullName} src={teacher.profileImage} size={40} />
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="font-semibold text-slate-900">{teacher.fullName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{teacher.teacherId}</div>
                      </TableCell>
                      <TableCell className="px-6 py-5 text-slate-700">{teacher.email}</TableCell>
                      <TableCell className="px-6 py-5 text-slate-700">{teacher.subject}</TableCell>
                      <TableCell className="px-6 py-5 text-slate-700">{teacher.specialization}</TableCell>
                      <TableCell className="px-6 py-5 text-slate-700">{teacher.experience} yrs</TableCell>
                      <TableCell className="px-6 py-5">
                        <StatusBadge status={teacher.status} />
                      </TableCell>
                      <TableCell className="px-6 py-5 text-slate-700">{teacher.joiningDate || "—"}</TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs"
                            onClick={() => loadTeacher(teacher.id, "view")}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 px-3 text-xs"
                            onClick={() => loadTeacher(teacher.id, "edit")}
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
              {teachers.map(teacher => (
                <div key={teacher.id} className="p-4 space-y-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar name={teacher.fullName} src={teacher.profileImage} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{teacher.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{teacher.email}</p>
                    </div>
                    <StatusBadge status={teacher.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                    <div>
                      <span className="text-muted-foreground text-xs">Subject</span>
                      <p className="font-medium">{teacher.subject}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Specialization</span>
                      <p className="font-medium">{teacher.specialization}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Experience</span>
                      <p className="font-medium">{teacher.experience} yrs</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Joined</span>
                      <p className="font-medium">{teacher.joiningDate || "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => loadTeacher(teacher.id, "view")}>
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => loadTeacher(teacher.id, "edit")}>
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
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} teachers
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
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
            <SheetTitle>{sheetMode === "edit" ? "Edit teacher" : "Teacher details"}</SheetTitle>
          </SheetHeader>
          {sheetLoading || !selectedTeacher || !form ? (
            <div className="space-y-4 py-6">
              <Skeleton className="h-20 w-20 rounded-full mx-auto" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : sheetMode === "view" ? (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center gap-3">
                <Avatar name={selectedTeacher.fullName} src={selectedTeacher.profileImage} size={80} />
                <div className="text-center">
                  <h2 className="font-display text-xl font-bold">{selectedTeacher.fullName}</h2>
                  <p className="text-sm text-muted-foreground">{selectedTeacher.email}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-1">{selectedTeacher.teacherId}</p>
                  <div className="mt-2">
                    <StatusBadge status={selectedTeacher.status} />
                  </div>
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border border-border p-4 bg-muted/20">
                <DetailRow label="Phone" value={selectedTeacher.phone} />
                <DetailRow label="Gender" value={selectedTeacher.gender} />
                <DetailRow label="Age" value={selectedTeacher.age != null ? String(selectedTeacher.age) : ""} />
                <DetailRow label="Subject" value={selectedTeacher.subject} />
                <DetailRow label="Specialization" value={selectedTeacher.specialization} />
                <DetailRow label="Experience" value={`${selectedTeacher.experience} years`} />
                <DetailRow label="Qualification" value={selectedTeacher.qualification} />
                <DetailRow label="Joining date" value={selectedTeacher.joiningDate} />
                <DetailRow
                  label="Salary"
                  value={selectedTeacher.salary != null ? `₹${selectedTeacher.salary.toLocaleString()}` : ""}
                />
                <DetailRow label="Address" value={selectedTeacher.address} />
              </div>
              <Button className="w-full rounded-xl" onClick={() => setSheetMode("edit")}>
                <Pencil className="w-4 h-4 mr-2" /> Edit teacher
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
                <Input value={selectedTeacher.email} disabled className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender || "unset"} onValueChange={v => setForm({ ...form, gender: v === "unset" ? "" : v })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not specified</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Experience (yrs)</Label>
                  <Input
                    type="number"
                    value={form.experience}
                    onChange={e => setForm({ ...form, experience: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input
                  value={form.specialization}
                  onChange={e => setForm({ ...form, specialization: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Qualification</Label>
                <Input
                  value={form.qualification}
                  onChange={e => setForm({ ...form, qualification: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Joining date</Label>
                <Input
                  type="date"
                  value={form.joiningDate}
                  onChange={e => setForm({ ...form, joiningDate: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Salary (₹)</Label>
                <Input
                  type="number"
                  value={form.salary}
                  onChange={e => setForm({ ...form, salary: e.target.value })}
                  className="rounded-xl"
                />
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
