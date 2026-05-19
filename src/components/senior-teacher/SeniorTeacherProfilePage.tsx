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
import { toast } from "sonner";

export type SeniorTeacherProfileData = {
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
  yearsOfExperience: number;
  qualification: string;
  address: string;
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

function toForm(p: SeniorTeacherProfileData): FormState {
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

export function SeniorTeacherProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<SeniorTeacherProfileData | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/senior-teacher/profile", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load profile");
      }
      const p = json.data.profile as SeniorTeacherProfileData;
      setProfile(p);
      setForm(toForm(p));
    } catch (e) {
      toast.error((e as Error).message);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "senior-teacher-profiles");
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
      const res = await fetch("/api/senior-teacher/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          ...(form.gender ? { gender: form.gender } : { gender: "" }),
          specialization: form.specialization.trim(),
          ...(form.profileImage ? { profileImage: form.profileImage } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      const p = json.data.profile as SeniorTeacherProfileData;
      setProfile(p);
      setForm(toForm(p));
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
      <PageHeader title="My Profile" subtitle="Your details from the Senior Teachers module (seniorteachers)" />

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500 via-accent to-primary text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
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
            <div className="text-xs uppercase tracking-widest font-bold opacity-90">Senior teacher portal</div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">{profile.fullName}</h1>
            <p className="opacity-90 text-sm">{profile.email}</p>
            <p className="opacity-75 text-xs font-mono">ID: {profile.teacherId || "—"}</p>
          </div>
        </div>

        <div className="p-6 space-y-8">
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
            <Button variant="outline" className="rounded-xl" onClick={() => router.push("/senior-teacher")}>
              <Home className="w-4 h-4 mr-1" /> Home
            </Button>
          </div>

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
              <ReadOnlyField label="Teacher ID" value={profile.teacherId} />
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
              <ReadOnlyField label="Salary overview" value={salaryDisplay} />
            </div>
          </div>

          <div>
            <h3 className="font-display font-bold text-lg mb-4 text-foreground">Work &amp; schedule</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField label="Assigned batches" value={profile.assignedBatches} />
              <ReadOnlyField label="Course name" value={profile.courseName} />
              <ReadOnlyField label="Joining date" value={profile.joiningDate} />
              <ReadOnlyField label="Branch name" value={profile.branchName} />
              <ReadOnlyField label="Years of experience" value={String(profile.yearsOfExperience ?? "")} />
            </div>
          </div>

          <div>
            <h3 className="font-display font-bold text-lg mb-4 text-foreground">Additional details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField label="Qualification" value={profile.qualification} />
              <ReadOnlyField label="Address" value={profile.address} />
              <ReadOnlyField label="Bio" value={profile.bio} />
              <ReadOnlyField label="Status" value={profile.status} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
