"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Plus, Search, Pencil, Eye, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar } from "@/components/shared/Avatar";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export interface SeniorTeacherItem {
  id: string;
  badgeId: string;
  fullName: string;
  email: string;
  phone: string;
  dob?: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  address: string;
  specialization: string;
  yearsOfExperience: number;
  role: string;
  qualification: string;
  joiningDate: string;
  salary: number;
  bio?: string;
  profileImage?: string;
  status: "Active" | "Inactive";
  assignedClasses: number;
  createdAt: string;
  updatedAt: string;
}

type SeniorTeacherForm = {
  id?: string;
  badgeId: string;
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  age: number;
  gender: string;
  bloodGroup: string;
  address: string;
  specialization: string;
  yearsOfExperience: number;
  role: string;
  qualification: string;
  joiningDate: string;
  salary: number;
  bio: string;
  profileImage: string;
  status: "Active" | "Inactive";
};

const SPECIALIZATIONS = ["Watercolor", "Oil Painting", "Sketching", "Digital Art", "Sculpture"];
const ROLES = ["Senior Faculty", "Lead Instructor", "Department Head"];
const STATUSES = ["Active", "Inactive"] as const;

const defaultForm: SeniorTeacherForm = {
  badgeId: "",
  fullName: "",
  email: "",
  phone: "",
  dob: "",
  age: 0,
  gender: "",
  bloodGroup: "",
  address: "",
  specialization: "Watercolor",
  yearsOfExperience: 1,
  role: "Senior Faculty",
  qualification: "",
  joiningDate: "",
  salary: 0,
  bio: "",
  profileImage: "",
  status: "Active",
};

const formatDateInputValue = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const mapTeacherToForm = (teacher: SeniorTeacherItem): SeniorTeacherForm => ({
  id: teacher.id,
  badgeId: teacher.badgeId ?? "",
  fullName: teacher.fullName ?? "",
  email: teacher.email ?? "",
  phone: teacher.phone ?? "",
  dob: formatDateInputValue(teacher.dob),
  age: teacher.age ?? 0,
  gender: teacher.gender ?? "",
  bloodGroup: teacher.bloodGroup ?? "",
  address: teacher.address ?? "",
  specialization: teacher.specialization ?? "Watercolor",
  yearsOfExperience: teacher.yearsOfExperience ?? 1,
  role: teacher.role ?? "Senior Faculty",
  qualification: teacher.qualification ?? "",
  joiningDate: formatDateInputValue(teacher.joiningDate),
  salary: teacher.salary ?? 0,
  bio: teacher.bio ?? "",
  profileImage: teacher.profileImage ?? "",
  status: teacher.status ?? "Active",
});

const buildTeacherPayload = (form: SeniorTeacherForm) => ({
  badgeId: form.badgeId,
  fullName: form.fullName,
  email: form.email,
  phone: form.phone || undefined,
  dob: form.dob || undefined,
  age: form.age || undefined,
  gender: form.gender || undefined,
  bloodGroup: form.bloodGroup || undefined,
  address: form.address || undefined,
  specialization: form.specialization,
  yearsOfExperience: form.yearsOfExperience,
  role: form.role,
  qualification: form.qualification || undefined,
  joiningDate: form.joiningDate || undefined,
  salary: form.salary || undefined,
  bio: form.bio || undefined,
  profileImage: form.profileImage || undefined,
  status: form.status,
});

export default function SeniorTeachersPage() {
  const [teachers, setTeachers] = useState<SeniorTeacherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [specialization, setSpecialization] = useState("All");
  const [role, setRole] = useState("All");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewTeacher, setViewTeacher] = useState<SeniorTeacherItem | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<SeniorTeacherItem | null>(null);
  const [form, setForm] = useState<SeniorTeacherForm>(defaultForm);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/senior-teachers");
      const data = await response.json();
      setTeachers(data.teachers || []);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to load senior teachers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  useEffect(() => {
    if (!form.dob) return;
    const date = new Date(form.dob);
    if (Number.isNaN(date.getTime())) return;
    const age = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    if (age !== form.age) {
      setForm((current) => ({ ...current, age }));
    }
  }, [form.dob]);

  const openAddTeacher = () => {
    setEditingTeacher(null);
    setForm(defaultForm);
    setSheetOpen(true);
  };

  const openEditTeacher = (teacher: SeniorTeacherItem) => {
    setEditingTeacher(teacher);
    setForm(mapTeacherToForm(teacher));
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingTeacher(null);
    setForm(defaultForm);
  };

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "senior-teacher-profiles");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setForm((current) => ({ ...current, profileImage: data.url }));
    } catch (error) {
      console.error("Photo upload error:", error);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setForm((current) => ({ ...current, profileImage: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = buildTeacherPayload(form);
    const isEdit = Boolean(editingTeacher?.id);
    const url = isEdit ? `/api/senior-teachers/${editingTeacher!.id}` : "/api/senior-teachers";
    const method = isEdit ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save senior teacher");
      }

      toast.success(isEdit ? "Senior teacher updated successfully" : "Senior teacher added successfully");
      closeSheet();
      await fetchTeachers();
    } catch (error) {
      console.error("Error saving teacher:", error);
      toast.error((error as Error).message || "Unable to save senior teacher");
    }
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const matchesQuery =
        !query ||
        teacher.fullName.toLowerCase().includes(query.toLowerCase()) ||
        teacher.email.toLowerCase().includes(query.toLowerCase()) ||
        teacher.specialization.toLowerCase().includes(query.toLowerCase());

      const matchesSpec = specialization === "All" || teacher.specialization === specialization;
      const matchesRole = role === "All" || teacher.role === role;
      return matchesQuery && matchesSpec && matchesRole;
    });
  }, [teachers, query, specialization, role]);

  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const paginatedTeachers = filteredTeachers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Senior Teachers"
        subtitle={`${teachers.length} senior art instructors`}
        action={
          <Button onClick={openAddTeacher} className="rounded-xl gradient-primary text-white border-0 shadow-pop">
            <Plus className="w-4 h-4 mr-1" />
            Add Senior Teacher
          </Button>
        }
      />

      <div className="card-soft p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, email or specialization..."
            className="pl-9 rounded-xl"
          />
        </div>
        <Select value={specialization} onValueChange={(value) => {
          setSpecialization(value);
          setCurrentPage(1);
        }}>
          <SelectTrigger className="rounded-xl sm:w-48">
            <SelectValue placeholder="Specialization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All specializations</SelectItem>
            {SPECIALIZATIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={role} onValueChange={(value) => {
          setRole(value);
          setCurrentPage(1);
        }}>
          <SelectTrigger className="rounded-xl sm:w-48">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="card-soft overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading senior teachers...</div>
        ) : filteredTeachers.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {teachers.length === 0 ? "No senior teachers yet. Add a senior teacher to get started." : "No matching senior teachers found."}
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                {
                  key: "name",
                  header: "Teacher",
                  render: (row) => {
                    const teacher = row as unknown as SeniorTeacherItem;
                    return (
                      <div className="flex items-center gap-3">
                        <Avatar name={teacher.fullName} src={teacher.profileImage} />
                        <div>
                          <div className="font-bold">{teacher.fullName}</div>
                          <div className="text-xs text-muted-foreground">{teacher.email || "N/A"}</div>
                        </div>
                      </div>
                    );
                  },
                },
                {
                  key: "badgeId",
                  header: "Badge ID",
                  render: (row) => {
                    const teacher = row as unknown as SeniorTeacherItem;
                    return <span className="font-mono text-sm">{teacher.badgeId}</span>;
                  },
                },
                { key: "specialization", header: "Specialization" },
                { key: "role", header: "Role" },
                {
                  key: "yearsOfExperience",
                  header: "Experience",
                  render: (row) => `${(row as unknown as SeniorTeacherItem).yearsOfExperience} years`,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => (
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        (row as unknown as SeniorTeacherItem).status === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {(row as unknown as SeniorTeacherItem).status}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (row) => {
                    const teacher = row as unknown as SeniorTeacherItem;
                    return (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditTeacher(teacher)}>
                          <Pencil className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setViewTeacher(teacher)}>
                          <Eye className="w-3 h-3 mr-1" /> View
                        </Button>
                      </div>
                    );
                  },
                },
              ]}
              rows={paginatedTeachers as unknown as Record<string, string | number | boolean>[]}
            />
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 p-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Senior Teacher Form</SheetTitle>
          </SheetHeader>
          <form className="grid gap-6 py-4" onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Photo</Label>
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="mx-auto h-28 w-28 overflow-hidden rounded-[28px] bg-slate-100">
                    {form.profileImage ? (
                      <img src={form.profileImage} alt="Teacher" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <UploadCloud className="w-7 h-7" />
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => document.getElementById("teacher-photo-input")?.click()}>
                    Upload photo
                  </Button>
                  <input
                    id="teacher-photo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) => setForm((current) => ({ ...current, fullName: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="badgeId">Badge ID</Label>
                  <Input
                    id="badgeId"
                    value={form.badgeId}
                    onChange={(e) => setForm((current) => ({ ...current, badgeId: e.target.value }))}
                    disabled={editingTeacher !== null}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm((current) => ({ ...current, dob: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={form.age || ""}
                    onChange={(e) => setForm((current) => ({ ...current, age: Number(e.target.value) }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bloodGroup">Blood group</Label>
                  <Input
                    id="bloodGroup"
                    value={form.bloodGroup}
                    onChange={(e) => setForm((current) => ({ ...current, bloodGroup: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={form.gender} onValueChange={(value) => setForm((current) => ({ ...current, gender: value }))}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Select
                    value={form.specialization}
                    onValueChange={(value) => setForm((current) => ({ ...current, specialization: value }))}
                  >
                    <SelectTrigger id="specialization">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALIZATIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="yearsOfExperience">Years of experience</Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    value={form.yearsOfExperience}
                    onChange={(e) => setForm((current) => ({ ...current, yearsOfExperience: Number(e.target.value) }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value }))}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input
                    id="qualification"
                    value={form.qualification}
                    onChange={(e) => setForm((current) => ({ ...current, qualification: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="joiningDate">Joining date</Label>
                  <Input
                    id="joiningDate"
                    type="date"
                    value={form.joiningDate}
                    onChange={(e) => setForm((current) => ({ ...current, joiningDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="salary">Salary</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={form.salary}
                    onChange={(e) => setForm((current) => ({ ...current, salary: Number(e.target.value) }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm((current) => ({ ...current, status: value as "Active" | "Inactive" }))}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => setForm((current) => ({ ...current, bio: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-between items-center gap-4 pt-4">
              <Button type="button" variant="outline" onClick={closeSheet}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto rounded-xl gradient-primary text-white border-0 shadow-pop">
                {editingTeacher ? "Update Senior Teacher" : "Add Senior Teacher"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={!!viewTeacher} onOpenChange={(open) => !open && setViewTeacher(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Senior Teacher Profile</DialogTitle>
          </DialogHeader>
          {viewTeacher && (
            <div className="grid gap-6 py-4">
              <div className="flex items-center justify-between gap-4 p-4 rounded-3xl border border-border bg-background">
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 rounded-3xl overflow-hidden bg-muted">
                    {viewTeacher.profileImage ? (
                      <img src={viewTeacher.profileImage} alt={viewTeacher.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <Avatar name={viewTeacher.fullName} />
                    )}
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{viewTeacher.fullName}</div>
                    <div className="text-sm text-muted-foreground">{viewTeacher.email || "No email provided"}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2 py-1">{viewTeacher.specialization}</span>
                      <span className="rounded-full bg-muted px-2 py-1">{viewTeacher.role}</span>
                      <span className="rounded-full bg-muted px-2 py-1">{viewTeacher.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-background p-5">
                  <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Personal details</div>
                  <div className="grid gap-2 text-sm">
                    <div>
                      <span className="font-medium">DOB:</span> {formatDateInputValue(viewTeacher.dob) || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Age:</span> {viewTeacher.age ?? "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Gender:</span> {viewTeacher.gender || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Blood group:</span> {viewTeacher.bloodGroup || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {viewTeacher.phone || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Address:</span> {viewTeacher.address || "N/A"}
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-border bg-background p-5">
                  <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Professional details</div>
                  <div className="grid gap-2 text-sm">
                    <div>
                      <span className="font-medium">Specialization:</span> {viewTeacher.specialization || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Role:</span> {viewTeacher.role || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Experience:</span> {viewTeacher.yearsOfExperience || "N/A"} years
                    </div>
                    <div>
                      <span className="font-medium">Qualification:</span> {viewTeacher.qualification || "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-background p-5">
                  <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Employment details</div>
                  <div className="grid gap-2 text-sm">
                    <div>
                      <span className="font-medium">Joining date:</span> {formatDateInputValue(viewTeacher.joiningDate) || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Salary:</span> {viewTeacher.salary ? `$${viewTeacher.salary}` : "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {viewTeacher.status || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Assigned Classes:</span> {viewTeacher.assignedClasses || 0}
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-border bg-background p-5">
                  <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Bio</div>
                  <div className="text-sm">{viewTeacher.bio || "No bio provided"}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
