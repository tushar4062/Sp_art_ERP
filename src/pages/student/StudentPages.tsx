"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CalendarDays, Wallet, Award, Clock, CreditCard, Download, Send, AlarmClock } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusPill } from "@/components/shared/StatusPill";
import { BirthdayBanner } from "@/components/shared/BirthdayBanner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CLASSES, todaysClasses, makeAttendance } from "@/data/mockData";
import { useStore, actions, type Student } from "@/store/dataStore";
import { CertificatePreview } from "@/pages/admin/Certificates";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday } from "date-fns";
import { toast } from "sonner";
export { ChatPage } from "@/legacy-pages/senior-teacher/SeniorTeacherPages";

function useMe() {
  const students = useStore(s => s.students);
  const student = students[0];
  if (!student) {
    const now = new Date();
    return {
      id: "",
      name: "Student",
      badgeId: "",
      class: CLASSES[0],
      email: "",
      parent: "",
      phone: "",
      age: 0,
      totalFee: 0,
      paidFee: 0,
      feeStatus: "Pending" as const,
      status: "Active" as const,
      isBirthdayToday: false,
      enrolled: format(now, "yyyy-MM-dd"),
      dob: format(now, "yyyy-MM-dd"),
    };
  }
  return { ...student, isBirthdayToday: true };
}

export function StudentDashboard() {
  const me = useMe();
  const att = makeAttendance(0);
  const pct = Math.round(att.filter(a => a.status === "Present").length / att.length * 100);
  const courseEnd = (me as Student & {courseEndDate?: string}).courseEndDate as string | undefined;
  const daysLeft = courseEnd ? Math.ceil((new Date(courseEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const showReminder = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
  return (
    <div className="space-y-6">
      <BirthdayBanner names={me.isBirthdayToday ? [me.name] : []} big />
      {showReminder && (
        <div className="card-soft p-4 border-l-4 border-warning bg-warning-soft/40 flex items-center gap-3">
          <div className="rounded-lg bg-warning/20 p-2"><AlarmClock className="w-5 h-5 text-warning" /></div>
          <div className="flex-1">
            <div className="font-bold text-sm">Your course ends in {daysLeft} days</div>
            <div className="text-xs text-muted-foreground">Renew with your teacher to keep painting with us 🎨</div>
          </div>
          <Button size="sm" className="rounded-lg gradient-primary text-white border-0" onClick={() => toast.success("Renewal request sent!")}>Renew</Button>
        </div>
      )}
      <div className="card-pop overflow-hidden">
        <div className="gradient-mint text-white p-6 sm:p-8">
          <div className="text-xs uppercase tracking-widest font-bold opacity-90">Welcome back</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">{me.name} 🎨</h1>
          <p className="opacity-90 mt-1">{me.badgeId} • {me.class}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Attendance" value={`${pct}%`} icon={CalendarDays} tone="success" />
        <StatCard label="Pending Fees" value={`₹${(me.totalFee - me.paidFee).toLocaleString()}`} icon={Wallet} tone="destructive" />
        <StatCard label="Certificates" value={3} icon={Award} tone="accent" />
        <StatCard label="Next Class" value="4:00 PM" icon={Clock} tone="info" />
      </div>
      <div className="card-soft p-5">
        <h3 className="font-display font-bold text-lg mb-3">Today's classes</h3>
        <div className="space-y-2">
          {todaysClasses.slice(0, 3).map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
              <div className="rounded-lg gradient-primary text-white px-3 py-1.5 text-sm font-bold">{c.time}</div>
              <div className="flex-1"><div className="font-bold">{c.subject}</div><div className="text-xs text-muted-foreground">{c.className}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface StudentAttendanceBatch {
  batchId: string;
  batchName: string;
  courseName?: string;
  batchDay?: string;
  batchTime?: string;
  batchTiming?: string;
}

interface StudentAttendanceRecord {
  batchId: string;
  studentName?: string;
  date: string | Date;
  status: "Present" | "Absent" | "Late" | string;
}

interface StudentAttendanceData {
  success?: boolean;
  allocatedBatches?: StudentAttendanceBatch[];
  records?: StudentAttendanceRecord[];
}

export function MyClassesStudent() {
  return (
    <div className="space-y-6">
      <PageHeader title="My Classes" subtitle="Your weekly schedule" />
      <div className="card-soft divide-y divide-border/60">
        {todaysClasses.map(c => (
          <div key={c.id} className="p-4 flex items-center gap-4">
            <div className="rounded-lg gradient-mint text-white px-3 py-2 font-bold text-sm">{c.time}</div>
            <div className="flex-1"><div className="font-bold">{c.subject}</div><div className="text-xs text-muted-foreground">{c.className}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RequestSlot() {
  const me = useMe();
  const allSlots = useStore(s => s.slots);
  const requests = allSlots.filter(r => r.studentId === me.id);
  const slots = [
    { class: "Acrylic Painting",  time: "4:30 PM", seats: 4 },
    { class: "Clay Sculpting",    time: "5:30 PM", seats: 6 },
    { class: "Pottery",           time: "6:00 PM", seats: 2 },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Request Slot" subtitle="Pick an open class slot" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((s, i) => (
          <div key={i} className="card-soft p-4 space-y-2">
            <div className="font-display font-bold">{s.class}</div>
            <div className="text-sm text-muted-foreground">{s.time} • {s.seats} seats left</div>
            <Button className="w-full rounded-xl gradient-primary text-white border-0" onClick={() => {
              actions.addSlotRequest({ studentId: me.id, student: me.name, badge: me.badgeId, class: s.class, time: s.time, date: format(new Date(),"yyyy-MM-dd") });
              toast.success("Request sent — teacher notified!");
            }}>
              Request entry
            </Button>
          </div>
        ))}
      </div>
      <div>
        <h3 className="font-display font-bold text-lg mb-3">My requests</h3>
        <div className="card-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr><th className="px-3 py-2 text-left">Class</th><th className="px-3 py-2 text-left">Time</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
            <tbody>{requests.map(r => <tr key={r.id} className="border-t border-border/60"><td className="px-3 py-2">{r.class}</td><td className="px-3 py-2">{r.time}</td><td className="px-3 py-2">{r.date}</td><td className="px-3 py-2"><StatusPill status={r.status} /></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function StudentAttendance() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const batchIdFromUrl = searchParams.get("batchId");
  
  const [batches, setBatches] = useState<StudentAttendanceBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(batchIdFromUrl);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<StudentAttendanceData | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Initial fetch of batches and attendance
  useEffect(() => {
    const fetchBatchesAndAttendance = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/student/attendance/report?month=${month}`, { credentials: "include" });
        const data = await res.json();
        console.log("[StudentAttendance] API Response:", data);
        
        if (data.success && data.allocatedBatches) {
          setBatches(data.allocatedBatches);
          setAttendanceData(data);
        }
      } catch (error) {
        console.error("Failed to fetch batches:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBatchesAndAttendance();
  }, [month]);

  useEffect(() => {
    if (batchIdFromUrl && batches.length > 0) {
      setSelectedBatchId(batchIdFromUrl);
    }
  }, [batchIdFromUrl, batches]);

  const handleAttendanceReportClick = (batchId: string) => {
    setSelectedBatchId(batchId);
    router.push(`?batchId=${encodeURIComponent(batchId)}`, { scroll: false });
  };

  const handleMonthChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    setMonth(newMonth);
  };

  const handleBackClick = () => {
    setSelectedBatchId(null);
    router.push("/student/attendance", { scroll: false });
  };

  // If batch selected and attendance data loaded, show calendar
  if (selectedBatchId && attendanceData) {
    return <StudentAttendanceCalendar 
      batchId={selectedBatchId}
      month={month}
      onMonthChange={handleMonthChange}
      onBackClick={handleBackClick}
      attendanceData={attendanceData}
    />;
  }

  // Otherwise show batch cards
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Attendance</h1>
        <p className="text-muted-foreground mt-2">Select a batch to view your attendance report</p>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-3xl bg-gradient-to-br from-slate-200 to-slate-100 animate-pulse" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-sm">
          <p className="text-slate-700 font-medium">No batches allocated yet</p>
          <p className="text-sm text-muted-foreground mt-2">Once your batches are allocated, you can view your attendance here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch) => (
            <div key={batch.batchId} className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{batch.batchName}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{batch.courseName || "Course"}</p>
                </div>
                
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📅</span>
                    <span>{batch.batchDay || "Days not specified"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🕐</span>
                    <span>{batch.batchTime || batch.batchTiming || "Timing not specified"}</span>
                  </div>
                </div>

                <Button 
                  onClick={() => handleAttendanceReportClick(batch.batchId)}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold py-2.5 shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  📊 View Attendance
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentAttendanceCalendar({ 
  batchId, 
  month, 
  onMonthChange, 
  onBackClick, 
  attendanceData 
}: {
  batchId: string;
  month: string;
  onMonthChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBackClick: () => void;
  attendanceData: StudentAttendanceData;
}) {
  // Filter attendance records for this batch only
  const normalizedBatchId = String(batchId).trim();
  const batchRecords = (attendanceData.records || []).filter((r: StudentAttendanceRecord) => {
    const recordBatchId = String(r.batchId || '').trim();
    return recordBatchId === normalizedBatchId;
  });
  
  console.log("[StudentAttendanceCalendar] batchId (normalized):", normalizedBatchId);
  console.log("[StudentAttendanceCalendar] All records count:", attendanceData.records?.length || 0);
  console.log("[StudentAttendanceCalendar] Record batchIds:", (attendanceData.records || []).map((r: StudentAttendanceRecord) => r.batchId));
  console.log("[StudentAttendanceCalendar] Filtered records for batch:", batchRecords);
  
  // Create a map of date -> status for quick lookup
  const attendanceMap: Record<string, string> = {};
  batchRecords.forEach((record: StudentAttendanceRecord) => {
    const raw =
      typeof record.date === "string"
        ? record.date.split("T")[0]
        : String(record.date ?? "");
    const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : raw.slice(0, 10);
    if (!dateStr) return;
    attendanceMap[dateStr] = record.status;
    console.log(`[StudentAttendanceCalendar] Mapped date ${dateStr} -> status ${record.status}`);
  });
  
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay });

  const summary = {
    present: batchRecords.filter((r: StudentAttendanceRecord) => r.status === "Present").length,
    absent: batchRecords.filter((r: StudentAttendanceRecord) => r.status === "Absent").length,
    late: batchRecords.filter((r: StudentAttendanceRecord) => r.status === "Late").length,
    total: batchRecords.length,
  };
  
  const percentage = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;

  const getDateClass = (day: number) => {
    const dateStr = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const status = attendanceMap[dateStr];
    
    if (status === "Present") return "bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:shadow-emerald-300";
    if (status === "Late") return "bg-amber-500 text-white shadow-lg shadow-amber-200 hover:shadow-amber-300";
    if (status === "Absent") return "bg-red-500 text-white shadow-lg shadow-red-200 hover:shadow-red-300";
    return "bg-slate-100 text-slate-400 border border-slate-200";
  };

  const selectedBatch = attendanceData.allocatedBatches?.find((b: StudentAttendanceBatch) => b.batchId === batchId);
  const studentName = batchRecords.length > 0 ? batchRecords[0]?.studentName : "Student";
  
  const monthLabel = new Date(year, monthNumber - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Premium Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-3xl blur-xl"></div>
          <div className="relative bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div className="flex items-start gap-4">
                <Button 
                  variant="ghost" 
                  onClick={onBackClick} 
                  className="rounded-xl hover:bg-slate-100 transition-colors"
                >
                  ← Back
                </Button>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] font-bold text-blue-600 mb-1">Attendance Report</p>
                  <h1 className="text-4xl font-bold text-slate-900 mb-2">{selectedBatch?.batchName}</h1>
                  <div className="flex items-center gap-3 text-slate-600">
                    <span className="text-sm">{selectedBatch?.courseName}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="text-sm font-semibold">📚 {selectedBatch?.batchDay}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {studentName?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-900">{studentName}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-[0.12em] font-semibold text-slate-600 block">Select Month</label>
                <input 
                  type="month" 
                  value={month} 
                  onChange={onMonthChange}
                  className="px-5 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Classes */}
          <div className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.1em] font-semibold text-slate-500 mb-2">Total Classes</p>
                <p className="text-4xl font-bold text-slate-900">{summary.total}</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl">📅</div>
            </div>
          </div>

          {/* Present Days */}
          <div className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.1em] font-semibold text-emerald-600 mb-2">Present Days</p>
                <p className="text-4xl font-bold text-emerald-700">{summary.present}</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">✓</div>
            </div>
          </div>

          {/* Absent Days */}
          <div className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow border border-red-200 bg-gradient-to-br from-red-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.1em] font-semibold text-red-600 mb-2">Absent Days</p>
                <p className="text-4xl font-bold text-red-700">{summary.absent}</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-2xl">✗</div>
            </div>
          </div>

          {/* Attendance Percentage */}
          <div className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow border border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.1em] font-semibold text-blue-600 mb-2">Attendance %</p>
                <p className="text-4xl font-bold text-blue-700">{percentage}%</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl">📊</div>
            </div>
          </div>
        </div>

        {/* Premium Calendar Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">{monthLabel} Calendar</h2>
          
          {/* Calendar Grid */}
          <div className="space-y-6">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-3">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider py-3 border-b-2 border-slate-200">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-3">
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {days.map(day => {
                const dateStr = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const status = attendanceMap[dateStr];
                const cls = getDateClass(day);
                const statusLabel = status === "Present" ? "P" : status === "Absent" ? "A" : status === "Late" ? "L" : "";
                
                return (
                  <div 
                    key={dateStr} 
                    className={`
                      aspect-square rounded-2xl flex flex-col items-center justify-center 
                      font-semibold text-sm transition-all duration-300 
                      hover:scale-110 cursor-pointer group
                      ${cls}
                      ${status ? "shadow-md" : ""}
                    `}
                  >
                    <div className={`text-xl font-bold ${!status ? 'text-slate-400' : ''}`}>{day}</div>
                    {statusLabel && <div className="text-xs font-bold mt-1 opacity-90">{statusLabel}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-lg">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Legend</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 shadow-md"></div>
              <span className="text-sm font-semibold text-slate-700">Present</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-red-500 shadow-md"></div>
              <span className="text-sm font-semibold text-slate-700">Absent</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500 shadow-md"></div>
              <span className="text-sm font-semibold text-slate-700">Late</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-slate-100 border-2 border-slate-300"></div>
              <span className="text-sm font-semibold text-slate-700">No Class</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export function StudentFees() {
  const me = useMe();
  const payments = useStore(s => s.payments);
  const [payOpen, setPayOpen] = useState(false);
  const balance = me.totalFee - me.paidFee;
  const myPays = payments.filter(p => p.student === me.name);
  return (
    <div className="space-y-6">
      <PageHeader title="My Fees" subtitle="Payments and dues" />
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Total Fee" value={`₹${me.totalFee.toLocaleString()}`} icon={Wallet} tone="info" />
        <StatCard label="Paid" value={`₹${me.paidFee.toLocaleString()}`} icon={CreditCard} tone="success" />
        <StatCard label="Balance" value={`₹${balance.toLocaleString()}`} icon={Wallet} tone="destructive" />
      </div>
      <div className="card-soft p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div><div className="font-display font-bold">Pay your balance</div><div className="text-sm text-muted-foreground">Quick & secure online payment</div></div>
        <Button className="rounded-xl text-white font-bold shadow-pop border-0" style={{ background: "#072654" }} onClick={() => setPayOpen(true)}>Pay ₹{balance.toLocaleString()} via Razorpay</Button>
      </div>
      <div>
        <h3 className="font-display font-bold text-lg mb-3">Payment history</h3>
        <div className="card-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Amount</th><th className="px-3 py-2 text-left">Mode</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
            <tbody>{myPays.length === 0 ? <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">No payments yet</td></tr> : myPays.map(p => <tr key={p.id} className="border-t border-border/60"><td className="px-3 py-2">{p.date}</td><td className="px-3 py-2">₹{p.amount.toLocaleString()}</td><td className="px-3 py-2">{p.mode}</td><td className="px-3 py-2"><StatusPill status={p.status} /></td></tr>)}</tbody>
          </table>
        </div>
      </div>
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Razorpay Checkout</DialogTitle></DialogHeader>
          <Tabs defaultValue="upi">
            <TabsList className="grid grid-cols-3 rounded-xl"><TabsTrigger value="upi">UPI</TabsTrigger><TabsTrigger value="card">Card</TabsTrigger><TabsTrigger value="nb">Netbanking</TabsTrigger></TabsList>
            <TabsContent value="upi" className="text-sm text-muted-foreground py-3">Open any UPI app to scan QR.</TabsContent>
            <TabsContent value="card" className="text-sm text-muted-foreground py-3">Visa / Master / Rupay accepted.</TabsContent>
            <TabsContent value="nb" className="text-sm text-muted-foreground py-3">All major banks supported.</TabsContent>
          </Tabs>
          <Button className="w-full rounded-xl text-white border-0" style={{ background: "#072654" }} onClick={() => {
            actions.recordPayment({ studentName: me.name, amount: balance, mode: "Online" });
            setPayOpen(false);
            toast.success("Payment successful! 🎉");
          }}>Pay ₹{balance.toLocaleString()}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function StudentCertificates() {
  const me = useMe();
  const certificates = useStore(s => s.certificates);
  const myCerts = certificates.filter(c => c.studentId === me.id);
  const [preview, setPreview] = useState<{ student: string; type: string } | null>(null);
  return (
    <div className="space-y-6">
      <PageHeader title="My Certificates" subtitle="Your achievements" action={
        <Button className="rounded-xl gradient-primary text-white border-0" onClick={() => toast.success("Request sent to admin")}><Send className="w-4 h-4 mr-1" />Request Certificate</Button>
      } />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {myCerts.map(c => (
          <div key={c.id} className="card-pop overflow-hidden">
            <div className="gradient-sunny p-6 text-center">
              <Award className="w-10 h-10 mx-auto text-secondary" />
              <div className="font-display font-bold text-xl mt-2 text-secondary">{c.type}</div>
            </div>
            <div className="p-4 space-y-2">
              <div className="text-sm font-semibold">{c.course}</div>
              <div className="text-xs text-muted-foreground">Issued {c.issued}</div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-lg" onClick={() => setPreview({ student: me.name, type: c.type })}>View</Button>
                <Button className="flex-1 rounded-lg gradient-primary text-white border-0"><Download className="w-3.5 h-3.5 mr-1" />PDF</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {preview && <CertificatePreview student={preview.student} type={preview.type} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StudentDashboard;
