"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Plus, Eye, Search, AlarmClock, Upload, User, UserPlus, Shield, Copy } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusPill } from "@/components/shared/StatusPill";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CLASSES, makeAttendance } from "@/data/mockData";
import { useStore, actions } from "@/store/dataStore";
import { toast } from "sonner";
import { adminSessionAuthHeaders } from "@/lib/auth/admin-session-client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const credentialsSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      "Password must contain uppercase, lowercase, number, and special character"),
  confirmPassword: z.string(),
  role: z.enum(["Student", "Class Representative", "Premium Student"]),
  portalAccess: z.boolean(),
  forcePasswordReset: z.boolean(),
  sendWelcomeEmail: z.boolean(),
  recoveryEmail: z.string().email().optional().or(z.literal("")),
  mobileNumber: z.string().optional(),
  studentIdNumber: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CredentialsForm = z.infer<typeof credentialsSchema>;

type StudentType = {
  id: string;
  name: string;
  email?: string;
  photo?: string;
  badgeId: string;
  class: string;
  feeStatus: string;
  parent?: string;
  dob?: string;
  age?: number;
  bloodGroup?: string;
  gender?: string;
  phone?: string;
  school?: string;
  college?: string;
  occupation?: string;
  fatherName?: string;
  fatherMobile?: string;
  motherName?: string;
  motherMobile?: string;
  address?: string;
  currentCourse?: string;
  batchDays?: string;
  batchTime?: string;
  courseDurationMonths?: number;
  artTeacher?: string;
  vanFacility?: boolean;
  enrolled?: string;
  status?: string;
  totalFee?: number;
  paidFee?: number;
};

type CertificateType = { id: string; studentId: string; type: string; course: string; issued: string; };

type PaymentType = { id: string; student: string; date: string; amount: number; mode: string; };

// Generate secure password
const generateSecurePassword = () => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';

  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
};

export default function Students() {
  const students = useStore(s => s.students);
  const certificates = useStore(s => s.certificates);
  const payments = useStore(s => s.payments);
  const teachers = useStore(s => s.teachers);
  const [selected, setSelected] = useState<typeof students[number] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const blankForm = {
    photo: "", name: "", dob: "", age: "", bloodGroup: "", gender: "",
    school: "", college: "", occupation: "",
    fatherName: "", fatherMobile: "",
    motherName: "", motherMobile: "",
    address: "",
    class: "", currentCourse: "", batchDays: "", batchTime: "",
    duration: "12", artTeacher: "", vanFacility: false,
  };
  const [form, setForm] = useState(blankForm);
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [filterClass, setFilterClass] = useState<string>("All");
  const [filterFee, setFilterFee] = useState<string>("All");

  // Credentials state
  const [credentialsModal, setCredentialsModal] = useState(false);
  const [selectedStudentForCredentials, setSelectedStudentForCredentials] = useState<typeof students[number] | null>(null);
  const [studentCredentials, setStudentCredentials] = useState<Record<string, { hasCredentials: boolean; credentials: { accountStatus: string; email: string } | null }>>({});
  const [loadingCredentials, setLoadingCredentials] = useState<Record<string, boolean>>({});

  const credentialsForm = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "Student",
      portalAccess: true,
      forcePasswordReset: true,
      sendWelcomeEmail: true,
      recoveryEmail: "",
      mobileNumber: "",
      studentIdNumber: "",
    },
  });

  // Fetch credentials for a student
  const fetchStudentCredentials = useCallback(async (studentId: string) => {
    if (studentCredentials[studentId] !== undefined) return; // Already fetched

    setLoadingCredentials(prev => ({ ...prev, [studentId]: true }));
    try {
      const response = await fetch(`/api/student-credentials/by-student?studentId=${studentId}`, {
        credentials: 'include',
        headers: { ...adminSessionAuthHeaders() },
      });
      const data = await response.json();
      setStudentCredentials(prev => ({ ...prev, [studentId]: data }));
    } catch (error) {
      console.error('Error fetching credentials:', error);
      setStudentCredentials(prev => ({ ...prev, [studentId]: { hasCredentials: false, credentials: null } }));
    } finally {
      setLoadingCredentials(prev => ({ ...prev, [studentId]: false }));
    }
  }, [studentCredentials]);

  // Fetch credentials for all students on mount
  useEffect(() => {
    students.forEach(student => {
      if (student.id) {
        fetchStudentCredentials(student.id);
      }
    });
  }, [students, fetchStudentCredentials]);

  const [allCredentials, setAllCredentials] = useState<Array<{ id: string; name: string; email: string; mobileNumber?: string; role: string; accountStatus: string; createdAt: string; studentId?: string }>>([]);
  const [loadingAllCredentials, setLoadingAllCredentials] = useState(false);

  useEffect(() => {
    const fetchAllCredentials = async () => {
      setLoadingAllCredentials(true);
      try {
        const response = await fetch('/api/student-credentials', {
          credentials: 'include',
          headers: { ...adminSessionAuthHeaders() },
        });
        const result = await response.json();
        setAllCredentials(result.credentials ?? []);
      } catch (error) {
        console.error('Error fetching all credentials:', error);
      } finally {
        setLoadingAllCredentials(false);
      }
    };

    fetchAllCredentials();
  }, []);

  // Reminders: students with course ending in <= 30 days
  const endingSoon = useMemo(() => {
    const now = Date.now();
    return students
      .map(s => {
        const courseEnd = typeof s === 'object' && s !== null && 'courseEndDate' in s ? (s as {courseEndDate?: string}).courseEndDate : undefined;
        if (!courseEnd) return null;
        const end = courseEnd as string;
        const ms = new Date(end).getTime() - now;
        const days = ms / (1000 * 60 * 60 * 24);
        if (days >= 0 && days <= 30) {
          return { ...s, daysLeft: Math.ceil(days) };
        }
        return null;
      })
      .filter(Boolean) as Array<typeof students[number] & { daysLeft: number }>;
  }, [students]);

  // Open credentials modal
  const openCredentialsModal = (student: typeof students[number]) => {
    setSelectedStudentForCredentials(student);
    credentialsForm.reset({
      username: student.name.toLowerCase().replace(/\s+/g, '') + Math.random().toString(36).substring(2, 5),
      email: student.email || "",
      password: "",
      confirmPassword: "",
      role: "Student",
      portalAccess: true,
      forcePasswordReset: true,
      sendWelcomeEmail: true,
      recoveryEmail: "",
      mobileNumber: student.phone || "",
      studentIdNumber: student.badgeId,
    });
    setCredentialsModal(true);
  };

  // Submit credentials
  const onSubmitCredentials = async (data: CredentialsForm) => {
    if (!selectedStudentForCredentials) return;

    try {
      const response = await fetch('/api/student-credentials', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminSessionAuthHeaders() },
        body: JSON.stringify({
          studentId: selectedStudentForCredentials.id,
          ...data,
          createdBy: 'Admin',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Credentials created successfully!');
        setStudentCredentials(prev => ({
          ...prev,
          [selectedStudentForCredentials.id]: { hasCredentials: true, credentials: result.credentials }
        }));
        setCredentialsModal(false);
        credentialsForm.reset();
      } else {
        toast.error(result.error || 'Failed to create credentials');
      }
    } catch (error) {
      console.error('Error creating credentials:', error);
      toast.error('Failed to create credentials');
    }
  };

  const credentialRows = allCredentials.map(c => ({
    id: c.id,
    name: c.name,
    email: c.email,
    badgeId: c.studentId ?? 'N/A',
    class: 'Student',
    feeStatus: 'N/A',
  }));

  const filteredStudents = students
    .filter(s => filterClass === "All" || s.class === filterClass)
    .filter(s => filterFee === "All" || s.feeStatus === filterFee)
    .filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.badgeId.toLowerCase().includes(q.toLowerCase()) || (s.parent ?? "").toLowerCase().includes(q.toLowerCase()));

  const filteredCredentialRows = credentialRows.filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.badgeId.toLowerCase().includes(q.toLowerCase()));

  const hasStudentRecords = students.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle={`${students.length} kids learning art with us`}
        action={
          <Sheet open={addOpen} onOpenChange={setAddOpen}>
            <SheetTrigger asChild>
              <Button className="rounded-xl gradient-primary text-white border-0 shadow-pop"><Plus className="w-4 h-4 mr-1" />Add Student</Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader><SheetTitle>Student Enrollment Form</SheetTitle></SheetHeader>
              <form className="space-y-6 mt-6 pb-10" onSubmit={e => {
                e.preventDefault();
                if (!form.name.trim()) return toast.error("Student name is required");
                actions.addStudent({
                  name: form.name.trim(),
                  age: Number(form.age) || 8,
                  class: form.class || CLASSES[1],
                  parent: form.fatherName || form.motherName,
                  phone: form.fatherMobile || form.motherMobile,
                  dob: form.dob,
                  courseDurationMonths: Number(form.duration) || 12,
                  photo: form.photo,
                  bloodGroup: form.bloodGroup,
                  gender: form.gender,
                  school: form.school,
                  college: form.college,
                  occupation: form.occupation,
                  fatherName: form.fatherName,
                  fatherMobile: form.fatherMobile,
                  motherName: form.motherName,
                  motherMobile: form.motherMobile,
                  address: form.address,
                  currentCourse: form.currentCourse || form.class,
                  batchDays: form.batchDays,
                  batchTime: form.batchTime,
                  artTeacher: form.artTeacher,
                  vanFacility: form.vanFacility,
                });
                toast.success("Student added — synced everywhere!");
                setAddOpen(false);
                setForm(blankForm);
              }}>
                {/* Personal */}
                <FormSection title="Personal Details">
                  <div className="flex items-start gap-4">
                    <div className="space-y-1.5">
                      <Label>Photo</Label>
                      <button type="button" onClick={() => fileRef.current?.click()} className="w-24 h-28 rounded-xl border-2 border-dashed border-border bg-muted/40 grid place-items-center overflow-hidden hover:bg-muted transition-colors">
                        {form.photo
                          ? <img src={form.photo} alt="student" className="w-full h-full object-cover" />
                          : <div className="text-center text-muted-foreground"><Upload className="w-5 h-5 mx-auto mb-1" /><div className="text-[10px]">Upload</div></div>}
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const r = new FileReader(); r.onload = () => setForm(s => ({ ...s, photo: String(r.result) })); r.readAsDataURL(f);
                      }} />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1.5"><Label>Student name *</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>Date of birth</Label><Input type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} /></div>
                        <div className="space-y-1.5"><Label>Age</Label><Input type="number" min={3} max={80} value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} /></div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Blood group</Label>
                      <Select value={form.bloodGroup} onValueChange={v => setForm(f => ({ ...f, bloodGroup: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Gender</Label>
                      <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{["Male","Female","Other"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </FormSection>

                {/* Education / Work */}
                <FormSection title="Education & Occupation">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5"><Label>School</Label><Input value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>College</Label><Input value={form.college} onChange={e => setForm(f => ({ ...f, college: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>Occupation</Label><Input value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} /></div>
                  </div>
                </FormSection>

                {/* Parents */}
                <FormSection title="Parents / Guardian">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Father's name</Label><Input value={form.fatherName} onChange={e => setForm(f => ({ ...f, fatherName: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>Father's mobile</Label><Input value={form.fatherMobile} onChange={e => setForm(f => ({ ...f, fatherMobile: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>Mother's name</Label><Input value={form.motherName} onChange={e => setForm(f => ({ ...f, motherName: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>Mother's mobile</Label><Input value={form.motherMobile} onChange={e => setForm(f => ({ ...f, motherMobile: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-1.5"><Label>Address</Label><Textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                </FormSection>

                {/* Course */}
                <FormSection title="Course Details">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Class</Label>
                      <Select value={form.class} onValueChange={v => setForm(f => ({ ...f, class: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label>Current course</Label><Input placeholder="e.g. Watercolor Basics" value={form.currentCourse} onChange={e => setForm(f => ({ ...f, currentCourse: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>Batch days</Label><Input placeholder="e.g. Mon, Wed, Fri" value={form.batchDays} onChange={e => setForm(f => ({ ...f, batchDays: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>Batch time</Label><Input placeholder="e.g. 4:00 - 5:30 PM" value={form.batchTime} onChange={e => setForm(f => ({ ...f, batchTime: e.target.value }))} /></div>
                    <div className="space-y-1.5">
                      <Label>Duration</Label>
                      <Select value={form.duration} onValueChange={v => setForm(f => ({ ...f, duration: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{["3","6","9","12","18","24"].map(m => <SelectItem key={m} value={m}>{m} months</SelectItem>)}</SelectContent>
                      </Select>
                      <div className="text-[11px] text-muted-foreground">Reminders sent 30 days before completion.</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Art teacher</Label>
                      <Select value={form.artTeacher} onValueChange={v => setForm(f => ({ ...f, artTeacher: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                        <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 mt-1 cursor-pointer">
                    <Checkbox checked={form.vanFacility} onCheckedChange={c => setForm(f => ({ ...f, vanFacility: !!c }))} />
                    <span className="text-sm">Van facility required</span>
                  </label>
                </FormSection>

                <Button type="submit" className="w-full rounded-xl gradient-primary text-white border-0">Add Student</Button>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      {endingSoon.length > 0 && (
        <div className="card-soft p-4 border-l-4 border-warning bg-warning-soft/40">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-warning/20 p-2"><AlarmClock className="w-5 h-5 text-warning" /></div>
            <div className="flex-1">
              <div className="font-bold text-sm">Course ending soon — {endingSoon.length} student{endingSoon.length > 1 ? "s" : ""}</div>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                {endingSoon.slice(0, 6).map(s => (
                  <span key={s.id} className="rounded-full bg-card border border-border px-2 py-0.5">
                    {s.name} • {s.daysLeft}d left
                  </span>
                ))}
              </div>
            </div>
            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => toast.success(`Renewal reminders sent to ${endingSoon.length} parents`)}>Send reminders</Button>
          </div>
        </div>
      )}

      <div className="card-soft p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, badge or parent..." className="pl-9 rounded-xl" />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="rounded-xl sm:w-48"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All classes</SelectItem>
            {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterFee} onValueChange={setFilterFee}>
          <SelectTrigger className="rounded-xl sm:w-40"><SelectValue placeholder="Fee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All fees</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasStudentRecords ? (
        <DataTable
          columns={[
            { key: "name", header: "Student", render: r => (
              <button onClick={() => setSelected(r)} className="flex items-center gap-3 text-left">
                <Avatar name={r.name} />
                <div>
                  <div className="font-bold">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </div>
              </button>
            )},
            { key: "badgeId", header: "Badge ID", render: r => <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{r.badgeId}</span> },
            { key: "class", header: "Class" },
            { key: "credentials", header: "Credentials", render: r => {
              const creds = studentCredentials[r.id];
              const loading = loadingCredentials[r.id];

              if (loading) {
                return <div className="text-xs text-muted-foreground">Loading...</div>;
              }

              if (!creds || !creds.hasCredentials) {
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-lg border-orange-200 text-orange-700 hover:bg-orange-50"
                    onClick={() => openCredentialsModal(r)}
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Create
                  </Button>
                );
              }

              const status = creds.credentials.accountStatus;
              const statusColor = status === 'Active' ? 'text-green-700 bg-green-50 border-green-200' :
                                 status === 'Inactive' ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
                                 'text-red-700 bg-red-50 border-red-200';

              return (
                <div className="space-y-1">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                    <Shield className="w-3 h-3 mr-1" />
                    {status}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {creds.credentials.email}
                  </div>
                </div>
              );
            }},
            { key: "feeStatus", header: "Fee", render: r => <StatusPill status={r.feeStatus} /> },
            { key: "x", header: "", render: r => <Button variant="ghost" size="sm" onClick={() => setSelected(r)}><Eye className="w-4 h-4" /></Button> },
          ]}
          rows={filteredStudents}
        />
      ) : (
        <DataTable
          columns={[
            { key: "name", header: "Student", render: r => <div className="font-bold">{r.name}</div> },
            { key: "badgeId", header: "Badge ID", render: r => <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{r.badgeId}</span> },
            { key: "class", header: "Class" },
            { key: "feeStatus", header: "Fee", render: r => <span className="text-sm text-muted-foreground">{r.feeStatus}</span> },
          ]}
          rows={filteredCredentialRows}
        />
      )}

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          {selected && <StudentProfile s={selected} certificates={certificates} payments={payments} />}
        </DialogContent>
      </Dialog>

      {/* Credentials Modal */}
      <Dialog open={credentialsModal} onOpenChange={setCredentialsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-orange-500" />
              Create Student Credentials
            </DialogTitle>
          </DialogHeader>

          {selectedStudentForCredentials && (
            <div className="space-y-6">
              {/* Student Information */}
              <div className="bg-muted/30 rounded-lg p-4 border">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Student Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <div className="font-medium">{selectedStudentForCredentials.name}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Badge ID:</span>
                    <div className="font-medium font-mono">{selectedStudentForCredentials.badgeId}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Class:</span>
                    <div className="font-medium">{selectedStudentForCredentials.class}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Parent:</span>
                    <div className="font-medium">{selectedStudentForCredentials.parent}</div>
                  </div>
                  {selectedStudentForCredentials.email && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Email:</span>
                      <div className="font-medium">{selectedStudentForCredentials.email}</div>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={credentialsForm.handleSubmit(onSubmitCredentials)} className="space-y-6">
                {/* Login Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm border-b pb-1">Login Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username *</Label>
                      <div className="relative">
                        <Input
                          id="username"
                          {...credentialsForm.register("username")}
                          className="pr-8"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-6 w-6 p-0"
                          onClick={() => {
                            const username = credentialsForm.getValues("username");
                            navigator.clipboard.writeText(username);
                            toast.success("Username copied!");
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      {credentialsForm.formState.errors.username && (
                        <p className="text-xs text-red-500">{credentialsForm.formState.errors.username.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        {...credentialsForm.register("email")}
                      />
                      {credentialsForm.formState.errors.email && (
                        <p className="text-xs text-red-500">{credentialsForm.formState.errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="password"
                          type="password"
                          {...credentialsForm.register("password")}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const password = generateSecurePassword();
                            credentialsForm.setValue("password", password);
                            credentialsForm.setValue("confirmPassword", password);
                          }}
                        >
                          Generate
                        </Button>
                      </div>
                      {(() => {
                        const password = credentialsForm.watch("password");
                        if (!password) return null;
                        const hasLower = /[a-z]/.test(password);
                        const hasUpper = /[A-Z]/.test(password);
                        const hasNumber = /\d/.test(password);
                        const hasSpecial = /[@$!%*?&]/.test(password);
                        const hasLength = password.length >= 8;
                        const strength = [hasLower, hasUpper, hasNumber, hasSpecial, hasLength].filter(Boolean).length;
                        const strengthText = strength <= 2 ? "Weak" : strength <= 4 ? "Medium" : "Strong";
                        const strengthColor = strength <= 2 ? "text-red-500" : strength <= 4 ? "text-yellow-500" : "text-green-500";
                        return (
                          <div className="text-xs">
                            <div className={`font-medium ${strengthColor}`}>Strength: {strengthText}</div>
                            <div className="flex gap-1 mt-1">
                              {[1,2,3,4,5].map(i => (
                                <div key={i} className={`h-1 w-4 rounded ${i <= strength ? strengthColor.replace('text-', 'bg-') : 'bg-gray-200'}`} />
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {credentialsForm.formState.errors.password && (
                        <p className="text-xs text-red-500">{credentialsForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        {...credentialsForm.register("confirmPassword")}
                      />
                      {credentialsForm.formState.errors.confirmPassword && (
                        <p className="text-xs text-red-500">{credentialsForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <strong>Password Requirements:</strong> Minimum 8 characters with at least one uppercase letter, one lowercase letter, one number, and one special character.
                  </div>
                </div>

                {/* Account Settings */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm border-b pb-1">Account Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={credentialsForm.watch("role")}
                        onValueChange={(value) => credentialsForm.setValue("role", value as CredentialsForm['role'])}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Student">Student</SelectItem>
                          <SelectItem value="Class Representative">Class Representative</SelectItem>
                          <SelectItem value="Premium Student">Premium Student</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentIdNumber">Student ID / Admission Number</Label>
                      <Input
                        id="studentIdNumber"
                        {...credentialsForm.register("studentIdNumber")}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="portalAccess"
                        checked={credentialsForm.watch("portalAccess")}
                        onCheckedChange={(checked) => credentialsForm.setValue("portalAccess", !!checked)}
                      />
                      <Label htmlFor="portalAccess" className="text-sm">Allow Student Portal Access</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="forcePasswordReset"
                        checked={credentialsForm.watch("forcePasswordReset")}
                        onCheckedChange={(checked) => credentialsForm.setValue("forcePasswordReset", !!checked)}
                      />
                      <Label htmlFor="forcePasswordReset" className="text-sm">Force Password Change on First Login</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sendWelcomeEmail"
                        checked={credentialsForm.watch("sendWelcomeEmail")}
                        onCheckedChange={(checked) => credentialsForm.setValue("sendWelcomeEmail", !!checked)}
                      />
                      <Label htmlFor="sendWelcomeEmail" className="text-sm">Send Welcome Email</Label>
                    </div>
                  </div>
                </div>

                {/* Optional Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm border-b pb-1">Optional Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mobileNumber">Mobile Number</Label>
                      <Input
                        id="mobileNumber"
                        {...credentialsForm.register("mobileNumber")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recoveryEmail">Recovery Email</Label>
                      <Input
                        id="recoveryEmail"
                        type="email"
                        {...credentialsForm.register("recoveryEmail")}
                      />
                      {credentialsForm.formState.errors.recoveryEmail && (
                        <p className="text-xs text-red-500">{credentialsForm.formState.errors.recoveryEmail.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCredentialsModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={credentialsForm.formState.isSubmitting}
                  >
                    {credentialsForm.formState.isSubmitting ? "Creating..." : "Create Credentials"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground border-b pb-1">{title}</div>
      {children}
    </div>
  );
}

function StudentProfile({ s, certificates, payments }: { s: StudentType; certificates: CertificateType[]; payments: PaymentType[] }) {
  const att = makeAttendance(0);
  const present = att.filter(a => a.status === "Present").length;
  const studentCerts = certificates.filter(c => c.studentId === s.id);
  const studentPays = payments.filter(p => p.student === s.name);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          {s.photo
            ? <img src={s.photo} alt={s.name} className="w-12 h-12 rounded-full object-cover" />
            : <Avatar name={s.name} size={48} />}
          <div>
            <div className="font-display text-xl">{s.name}</div>
            <div className="text-xs text-muted-foreground font-normal">{s.badgeId} • {s.class}</div>
          </div>
        </DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="profile" className="mt-2 max-h-[70vh] overflow-y-auto">
        <TabsList className="grid grid-cols-5 w-full rounded-xl">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="att">Attendance</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="certs">Certificates</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <div className="space-y-4 text-sm">
            <ProfileGroup title="Personal">
              <Field k="Date of birth" v={s.dob} />
              <Field k="Age" v={String(s.age || "—")} />
              <Field k="Blood group" v={s.bloodGroup || "—"} />
              <Field k="Gender" v={s.gender || "—"} />
            </ProfileGroup>
            <ProfileGroup title="Education & Occupation">
              <Field k="School" v={s.school || "—"} />
              <Field k="College" v={s.college || "—"} />
              <Field k="Occupation" v={s.occupation || "—"} />
            </ProfileGroup>
            <ProfileGroup title="Parents">
              <Field k="Father" v={s.fatherName || s.parent || "—"} />
              <Field k="Father mobile" v={s.fatherMobile || s.phone || "—"} />
              <Field k="Mother" v={s.motherName || "—"} />
              <Field k="Mother mobile" v={s.motherMobile || "—"} />
            </ProfileGroup>
            <ProfileGroup title="Contact" cols={1}>
              <Field k="Address" v={s.address || "—"} />
              <Field k="Email" v={s.email} />
            </ProfileGroup>
            <ProfileGroup title="Course">
              <Field k="Current course" v={s.currentCourse || s.class} />
              <Field k="Batch days" v={s.batchDays || "—"} />
              <Field k="Batch time" v={s.batchTime || "—"} />
              <Field k="Duration" v={s.courseDurationMonths ? `${s.courseDurationMonths} months` : "—"} />
              <Field k="Art teacher" v={s.artTeacher || "—"} />
              <Field k="Van facility" v={s.vanFacility ? "Yes" : "No"} />
              <Field k="Enrolled" v={s.enrolled} />
              <Field k="Status" v={s.status} />
            </ProfileGroup>
          </div>
        </TabsContent>
        <TabsContent value="att" className="mt-4">
          <div className="card-soft p-4 mb-3 flex gap-6">
            <div><div className="text-xs text-muted-foreground">Attendance</div><div className="font-display text-2xl font-bold text-success">{Math.round(present / att.length * 100)}%</div></div>
            <div><div className="text-xs text-muted-foreground">Present days</div><div className="font-display text-2xl font-bold">{present}</div></div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {att.map(a => (
              <div key={a.date} title={`${a.date}: ${a.status}`} className={`aspect-square rounded ${
                a.status === "Present" ? "bg-success/80" : a.status === "Late" ? "bg-warning/80" : "bg-destructive/70"
              }`} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="fees" className="mt-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field k="Total" v={`₹${s.totalFee.toLocaleString()}`} />
            <Field k="Paid" v={`₹${s.paidFee.toLocaleString()}`} />
            <Field k="Balance" v={`₹${(s.totalFee - s.paidFee).toLocaleString()}`} />
          </div>
          <div className="card-soft overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-muted"><tr>
              <th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Amount</th><th className="px-3 py-2 text-left">Mode</th>
            </tr></thead><tbody>
              {studentPays.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-muted-foreground">No payments yet</td></tr>}
              {studentPays.map(p => <tr key={p.id} className="border-t border-border/60"><td className="px-3 py-2">{p.date}</td><td className="px-3 py-2">₹{p.amount.toLocaleString()}</td><td className="px-3 py-2">{p.mode}</td></tr>)}
            </tbody></table>
          </div>
        </TabsContent>
        <TabsContent value="certs" className="mt-4 grid sm:grid-cols-3 gap-3">
          {studentCerts.map(c => (
            <div key={c.id} className="card-soft p-4">
              <div className="font-bold">{c.type}</div>
              <div className="text-xs text-muted-foreground">{c.course}</div>
              <div className="text-[10px] text-muted-foreground mt-1">Issued {c.issued}</div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="chat" className="mt-4">
          <div className="card-soft p-4 text-sm text-muted-foreground text-center py-10">Chat with parent — open the Chat module.</div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function ProfileGroup({ title, cols = 2, children }: { title: string; cols?: 1 | 2; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">{title}</div>
      <div className={`grid gap-3 ${cols === 1 ? "" : "sm:grid-cols-2"}`}>{children}</div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return <div className="card-soft p-3"><div className="text-xs text-muted-foreground">{k}</div><div className="font-bold mt-0.5">{v}</div></div>;
}
