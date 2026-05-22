"use client";

import { useEffect, useState } from "react";
import { Calendar, ClipboardCheck, Users as UsersIcon, Check, X, Plus, CalendarOff } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusPill } from "@/components/shared/StatusPill";
import { Avatar } from "@/components/shared/Avatar";
import { BirthdayBanner } from "@/components/shared/BirthdayBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { todaysClasses, CLASSES } from "@/data/mockData";
import { useStore, actions } from "@/store/dataStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TeacherAttendancePage } from "@/components/teacher/TeacherAttendancePage";
export { ChatPage } from "@/legacy-pages/senior-teacher/SeniorTeacherPages";

export function TeacherDashboard() {
  const students = useStore(s => s.students);
  const slots = useStore(s => s.slots);
  const birthdays = students.filter(s => s.isBirthdayToday).map(s => s.name);
  return (
    <div className="space-y-6">
      <PageHeader title="Hello, Sneha 👋" subtitle="Here's your day at a glance" />
      <BirthdayBanner names={birthdays} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Classes Today" value={todaysClasses.length} icon={Calendar} tone="primary" />
        <StatCard label="Slot Requests" value={slots.filter(r => r.status === "Pending").length} icon={ClipboardCheck} tone="warning" />
        <StatCard label="My Students" value={students.length} icon={UsersIcon} tone="info" />
        <StatCard label="Leave Balance" value="9 days" icon={CalendarOff} tone="success" />
      </div>
      <div className="card-soft p-5">
        <h3 className="font-display font-bold text-lg mb-4">Today's timeline</h3>
        <div className="space-y-3">
          {todaysClasses.map((c, i) => (
            <div key={c.id} className="flex gap-4 items-center animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="w-20 text-right text-sm font-bold text-secondary">{c.time}</div>
              <div className="w-3 h-3 rounded-full gradient-primary shrink-0" />
              <div className="flex-1 card-soft p-3"><div className="font-bold">{c.subject}</div><div className="text-xs text-muted-foreground">{c.className} • {c.students} students</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TeacherSlotRequests() {
  const reqs = useStore(s => s.slots);
  function act(id: string, ok: boolean) {
    actions.setSlotStatus(id, ok ? "Approved" : "Denied");
    toast.success(ok ? "Approved" : "Denied");
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Slot Requests" subtitle="Approve student entry requests" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reqs.map(r => (
          <div key={r.id} className="card-soft p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><Avatar name={r.student} /><div><div className="font-bold text-sm">{r.student}</div><div className="text-xs text-muted-foreground font-mono">{r.badge}</div></div></div>
              {r.status === "Approved" && <StatusPill status="Entry Allowed" />}
              {r.status === "Denied"   && <StatusPill status="Denied" />}
              {r.status === "Pending"  && <StatusPill status="Pending" />}
            </div>
            <div className="text-sm"><div><span className="text-muted-foreground">Class:</span> <span className="font-semibold">{r.class}</span></div><div><span className="text-muted-foreground">Time:</span> <span className="font-semibold">{r.time}</span></div></div>
            {r.status === "Pending" && (
              <div className="flex gap-2 pt-2 border-t border-border/60">
                <Button variant="outline" className="flex-1 rounded-lg" onClick={() => act(r.id, false)}><X className="w-4 h-4 mr-1" />Deny</Button>
                <Button className="flex-1 rounded-lg bg-success text-success-foreground hover:bg-success/90" onClick={() => act(r.id, true)}><Check className="w-4 h-4 mr-1" />Approve</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeacherAttendance() {
  return <TeacherAttendancePage />;
}

export { TeacherLeavePage as TeacherLeave } from "@/components/teacher/TeacherLeavePage";

type TeacherClasses = {
  assignedBatches: string;
  courseName: string;
  className: string;
  batchDetails: string;
  classes: string[];
};

export function TeacherMyClasses() {
  const [profile, setProfile] = useState<TeacherClasses | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const res = await fetch("/api/teacher/profile", { credentials: "include" });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to load classes");
        }

        if (!isMounted) return;
        setProfile({
          assignedBatches: json.data.profile.assignedBatches ?? "",
          courseName: json.data.profile.courseName ?? "",
          className: json.data.profile.className ?? "",
          batchDetails: json.data.profile.batchDetails ?? "",
          classes: json.data.profile.classes ?? [],
        });
      } catch (error) {
        console.error("Failed to load teacher classes", error);
        if (isMounted) {
          setProfile({ assignedBatches: "", courseName: "", className: "", batchDetails: "", classes: [] });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="My Classes" subtitle="Your teaching schedule" />
      <div className="card-soft divide-y divide-border/60">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading classes…</div>
        ) : profile?.classes?.length ? (
          profile.classes.map((className, index) => (
            <div key={`${className}-${index}`} className="p-4 flex items-center gap-4">
              <div className="rounded-lg gradient-primary text-white px-3 py-2 font-bold text-sm">{index + 1}</div>
              <div className="flex-1">
                <div className="font-bold">{className}</div>
                <div className="text-xs text-muted-foreground">{profile.courseName || profile.className || profile.batchDetails || profile.assignedBatches}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-sm text-muted-foreground">No classes assigned yet.</div>
        )}
      </div>
    </div>
  );
}
