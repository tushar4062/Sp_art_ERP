"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, MessageSquarePlus, Pencil, Save, UploadCloud, User, Calendar } from "lucide-react";
import { TeacherQueryRequestModal } from "@/components/teacher/TeacherQueryRequestModal";
import { QueryStatusBadge } from "@/components/student/QueryStatusBadge";
import type { TeacherQueryDto } from "@/lib/teacher/teacherQueryAccess";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type TeacherProfileData = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  teacherId: string;
  specialization: string;
  assignedBatches: string;
  courseName: string;
  joiningDate: string;
  salary: number | null;
  branchName: string;
  role: string;
  profileImage: string;
  dob: string;
  age: number | null;
  bloodGroup: string;
  schoolCollege: string;
  parentGuardianDetails: string;
  address: string;
  className: string;
  experience: number;
  batchDetails: string;
  qualification: string;
  bio: string;
  status: string;
};

type FormState = {
  fullName: string;
  phone: string;
  gender: string;
  specialization: string;
  profileImage: string;
};

function toForm(p: TeacherProfileData): FormState {
  return {
    fullName: p.fullName,
    phone: p.phone,
    gender: p.gender || "",
    specialization: p.specialization,
    profileImage: p.profileImage,
  };
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs uppercase tracking-wide">{label}</Label>
      <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

export function TeacherProfilePage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [profile, setProfile] = useState<TeacherProfileData | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [canEditProfile, setCanEditProfile] = useState(false);
  const [latestQuery, setLatestQuery] = useState<TeacherQueryDto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/profile", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load profile");
      }
      const p = json.data.profile as TeacherProfileData;
      setProfile(p);
      setForm(toForm(p));
      setCanEditProfile(Boolean(json.data.canEditProfile));
      setLatestQuery((json.data.latestQuery as TeacherQueryDto | null) ?? null);
    } catch (e) {
      toast.error((e as Error).message);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const refreshQueryStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/queries?limit=1", { credentials: "include" });
      const json = await res.json();
      if (res.ok) {
        setCanEditProfile(Boolean(json.data?.canEditProfile));
        setLatestQuery((json.data?.latestQuery as TeacherQueryDto | null) ?? null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "teacher-profiles");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setForm(f => (f ? { ...f, profileImage: data.url } : f));
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form || !profile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          gender: form.gender,
          specialization: form.specialization.trim(),
          profileImage: form.profileImage,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      const p = json.data.profile as TeacherProfileData;
      setProfile(p);
      setForm(toForm(p));
      if (user?.email) login("teacher", user.email, p.fullName);
      setEditing(false);
      toast.success(json.message || "Saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (profile) setForm(toForm(profile));
    setEditing(false);
  };

  if (loading || !profile || !form) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
        Loading profile…
      </div>
    );
  }

  const salaryDisplay =
    profile.salary != null && !Number.isNaN(profile.salary) ? `₹${profile.salary.toLocaleString()}` : "—";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      <PageHeader title="My Profile" subtitle="Your details from the Teachers module" />

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <div className="h-28 w-28 rounded-3xl border-4 border-white/30 bg-white/15 overflow-hidden flex items-center justify-center">
              {form.profileImage ? (
                <img src={form.profileImage} alt={profile.fullName} className="h-full w-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-white/80" />
              )}
            </div>
            {editing && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full text-xs shadow-md"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <UploadCloud className="w-3 h-3 mr-1" />
                {uploading ? "…" : "Photo"}
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f);
              }}
            />
          </div>
          <div className="text-center sm:text-left flex-1 space-y-1">
            <div className="text-xs uppercase tracking-widest font-bold opacity-90">Teacher portal</div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">{profile.fullName}</h1>
            <p className="opacity-90 text-sm">{profile.email}</p>
            <p className="opacity-75 text-xs font-mono">Badge: {profile.teacherId || "—"}</p>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {latestQuery && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Latest query:</span>
              <QueryStatusBadge status={latestQuery.status} />
              {latestQuery.status === "pending" && (
                <span className="text-xs text-muted-foreground">
                  Edit Profile unlocks after admin approval
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!editing ? (
              <Button
                className="rounded-xl gradient-primary text-white border-0"
                onClick={() => setEditing(true)}
                disabled={!canEditProfile}
                title={
                  canEditProfile
                    ? "Edit your profile"
                    : "Submit and get a query approved to edit your profile"
                }
              >
                <Pencil className="w-4 h-4 mr-1" /> Edit Profile
              </Button>
            ) : (
              <>
                <Button
                  className="rounded-xl gradient-primary text-white border-0"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save Changes"}
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </Button>
              </>
            )}
            <Button
              variant="outline"
              className="rounded-xl border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => setQueryOpen(true)}
            >
              <MessageSquarePlus className="w-4 h-4 mr-1" /> Request Query Form
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => router.push("/teacher")}>
              <Home className="w-4 h-4 mr-1" /> Home
            </Button>
            <Button
              variant="ghost"
              className="rounded-xl"
              onClick={() => router.push("/teacher/profile/attendance-report")}
            >
              <Calendar className="w-4 h-4 mr-1" /> Attendance Report
            </Button>
          </div>

          <TeacherQueryRequestModal
            open={queryOpen}
            onOpenChange={setQueryOpen}
            defaultName={profile.fullName}
            defaultEmail={profile.email}
            onSubmitted={() => {
              void refreshQueryStatus();
              void loadProfile();
            }}
          />

          <div>
            <h3 className="font-display font-bold text-lg mb-4 text-foreground">Core details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {editing ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              ) : (
                <ReadOnlyField label="Full name" value={profile.fullName} />
              )}
              <ReadOnlyField label="Email" value={profile.email} />
              {editing ? (
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              ) : (
                <ReadOnlyField label="Phone" value={profile.phone} />
              )}
              {editing ? (
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select
                    value={form.gender || "unset"}
                    onValueChange={v => setForm({ ...form, gender: v === "unset" ? "" : v })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not specified</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <ReadOnlyField label="Gender" value={profile.gender} />
              )}
              <ReadOnlyField label="Teacher ID (Badge)" value={profile.teacherId} />
              {editing ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="spec">Specialization</Label>
                  <Input
                    id="spec"
                    value={form.specialization}
                    onChange={e => setForm({ ...form, specialization: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              ) : (
                <ReadOnlyField label="Specialization" value={profile.specialization} />
              )}
              <ReadOnlyField label="Role" value={profile.role} />
              <ReadOnlyField label="Salary" value={salaryDisplay} />
            </div>
          </div>

          <div>
            <h3 className="font-display font-bold text-lg mb-4 text-foreground">Work &amp; schedule</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField label="Assigned batches / classes" value={profile.assignedBatches} />
              <ReadOnlyField label="Course / subject" value={profile.courseName} />
              <ReadOnlyField label="Class" value={profile.className} />
              <ReadOnlyField label="Batch details" value={profile.batchDetails} />
              <ReadOnlyField label="Joining date" value={profile.joiningDate} />
              <ReadOnlyField label="Branch name" value={profile.branchName} />
              <ReadOnlyField label="Experience (years)" value={String(profile.experience ?? "")} />
            </div>
          </div>

          <div>
            <h3 className="font-display font-bold text-lg mb-4 text-foreground">Personal &amp; other</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField label="Date of birth" value={profile.dob} />
              <ReadOnlyField label="Age" value={profile.age != null ? String(profile.age) : ""} />
              <ReadOnlyField label="Blood group" value={profile.bloodGroup} />
              <ReadOnlyField label="School / college" value={profile.schoolCollege} />
              <ReadOnlyField label="Parent / guardian" value={profile.parentGuardianDetails} />
              <ReadOnlyField label="Address" value={profile.address} />
              <ReadOnlyField label="Qualification" value={profile.qualification} />
              <ReadOnlyField label="Bio" value={profile.bio} />
              <ReadOnlyField label="Status" value={profile.status} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
