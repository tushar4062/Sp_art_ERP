"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Pencil, Save, UploadCloud, User } from "lucide-react";
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

export type StudentProfileData = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  age: number | null;
  gender: string;
  studentId: string;
  profileImage: string;
  batchName: string;
  batchTiming: string;
  courseName: string;
  teacherName: string;
  role: string;
};

type FormState = {
  fullName: string;
  phone: string;
  age: string;
  gender: string;
  profileImage: string;
};

function profileToForm(p: StudentProfileData): FormState {
  return {
    fullName: p.fullName,
    phone: p.phone,
    age: p.age != null ? String(p.age) : "",
    gender: p.gender || "",
    profileImage: p.profileImage,
  };
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs uppercase tracking-wide">{label}</Label>
      <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm font-medium">
        {value || "—"}
      </div>
    </div>
  );
}

export function StudentProfilePage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/profile", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load profile");
      }
      const p = data.data.profile as StudentProfileData;
      setProfile(p);
      setForm(profileToForm(p));
      if (user?.email !== p.email || user?.name !== p.fullName) {
        login("student", p.email, p.fullName);
      }
    } catch (error) {
      toast.error((error as Error).message);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [login, router, user?.email, user?.name]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "student-profiles");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setForm(f => (f ? { ...f, profileImage: data.url } : f));
      toast.success("Photo uploaded");
    } catch (error) {
      toast.error((error as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form || !profile) return;
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        profileImage: form.profileImage,
        age: form.age ? Number(form.age) : null,
      };
      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      const updated = data.data.profile as StudentProfileData;
      setProfile(updated);
      setForm(profileToForm(updated));
      login("student", updated.email, updated.fullName);
      setEditing(false);
      toast.success(data.message || "Profile saved");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (profile) setForm(profileToForm(profile));
    setEditing(false);
  };

  if (loading || !profile || !form) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
        Loading your profile…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="My Profile" subtitle="View and update your student details" />

      <div className="card-soft overflow-hidden">
        <div className="gradient-mint text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <div className="h-28 w-28 rounded-3xl border-4 border-white/30 bg-white/20 overflow-hidden flex items-center justify-center">
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
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className="text-xs uppercase tracking-widest font-bold opacity-90">Student portal</div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">{profile.fullName}</h1>
            <p className="opacity-90 text-sm mt-1">{profile.email}</p>
            <p className="opacity-75 text-xs mt-2 font-mono">ID: {profile.studentId}</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
            <div className="flex flex-wrap gap-2">
            {!editing ? (
              <Button className="rounded-xl gradient-primary text-white border-0" onClick={() => setEditing(true)}>
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
            <Button variant="outline" className="rounded-xl" onClick={() => router.push("/student/dashboard")}>
              <Home className="w-4 h-4 mr-1" /> Home
            </Button>

          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {editing ? (
              <>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    min={1}
                    max={120}
                    value={form.age}
                    onChange={e => setForm({ ...form, age: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={form.gender || "unset"} onValueChange={v => setForm({ ...form, gender: v === "unset" ? "" : v })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not specified</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <ReadOnlyField label="Full name" value={profile.fullName} />
                <ReadOnlyField label="Phone number" value={profile.phone} />
                <ReadOnlyField label="Gender" value={profile.gender} />
                <ReadOnlyField label="Age" value={profile.age != null ? String(profile.age) : ""} />
              </>
            )}
            <ReadOnlyField label="Email" value={profile.email} />
            <ReadOnlyField label="Student ID" value={profile.studentId} />
            <ReadOnlyField label="Role" value={profile.role} />
          </div>

          <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
            <h3 className="font-display font-bold text-lg">Class & course</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField label="Batch name" value={profile.batchName} />
              <ReadOnlyField label="Batch timing" value={profile.batchTiming} />
              <ReadOnlyField label="Course name" value={profile.courseName} />
              <ReadOnlyField label="Teacher name" value={profile.teacherName} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentProfilePage;
