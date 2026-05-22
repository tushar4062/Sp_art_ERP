"use client";

import { useState, useEffect } from "react";
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
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/student/attendance/report?month=" + month, { credentials: "include" });
        const data = await res.json();
        if (data.success && data.allocatedBatches) {
          setBatches(data.allocatedBatches);
        }
      } catch (error) {
        console.error("Failed to fetch batches:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

  const handleAttendanceReportClick = async (batchId: string) => {
    setSelectedBatchId(batchId);
    await fetchAttendanceForBatch(batchId, month);
  };

  const fetchAttendanceForBatch = async (batchId: string, selectedMonth: string) => {
    try {
      setAttendanceLoading(true);
      const res = await fetch(`/api/student/attendance/report?month=${selectedMonth}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setAttendanceData(data);
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleMonthChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    setMonth(newMonth);
    if (selectedBatchId) {
      await fetchAttendanceForBatch(selectedBatchId, newMonth);
    }
  };

  // If batch selected and attendance data loaded, show calendar
  if (selectedBatchId && attendanceData) {
    return <StudentAttendanceCalendar 
      batchId={selectedBatchId}
      month={month}
      onMonthChange={handleMonthChange}
      onBackClick={() => {
        setSelectedBatchId(null);
        setAttendanceData(null);
      }}
      attendanceData={attendanceData}
    />;
  }

  // Otherwise show batch cards
  return (
    <div className="space-y-6">
      <PageHeader title="My Attendance" subtitle="Select a batch to view attendance" />
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-soft h-64 animate-pulse" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div className="card-soft p-8 text-center">
          <div className="text-muted-foreground">No batches allocated</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch) => (
            <div key={batch.batchId} className="card-soft p-5 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div>
                  <div className="font-display font-bold text-lg">{batch.batchName}</div>
                  <div className="text-sm text-muted-foreground mt-1">{batch.courseName || "Course"}</div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">📅</span>
                    <span>{batch.batchDay || "Days not set"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">🕐</span>
                    <span>{batch.batchTime || batch.batchTiming || "Timing not set"}</span>
                  </div>
                </div>

                <Button 
                  onClick={() => handleAttendanceReportClick(batch.batchId)}
                  className="w-full rounded-lg gradient-primary text-white border-0"
                >
                  📊 Attendance Report
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
  attendanceData: any;
}) {
  // Filter attendance records for this batch only
  const batchRecords = (attendanceData.records || []).filter((r: any) => r.batchId === batchId);
  const map = Object.fromEntries(batchRecords.map((a: any) => [a.date, a.status]));
  
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay });

  const summary = {
    present: batchRecords.filter((r: any) => r.status === "Present").length,
    absent: batchRecords.filter((r: any) => r.status === "Absent").length,
    late: batchRecords.filter((r: any) => r.status === "Late").length,
    total: batchRecords.length,
  };
  
  const percentage = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;

  const getDateClass = (day: number) => {
    const dateStr = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const st = map[dateStr];
    
    if (st === "Present") return "bg-success text-success-foreground";
    if (st === "Late") return "bg-warning text-warning-foreground";
    if (st === "Absent") return "bg-destructive text-destructive-foreground";
    return "bg-muted/40";
  };

  const selectedBatch = attendanceData.allocatedBatches?.find((b: any) => b.batchId === batchId);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col space-y-4 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" onClick={onBackClick}>← Back to batches</Button>
        <div className="text-center">
          <div className="font-display font-bold text-sm">{selectedBatch?.batchName}</div>
          <div className="text-[11px] text-muted-foreground">{selectedBatch?.courseName}</div>
        </div>
        <input 
          type="month" 
          value={month} 
          onChange={onMonthChange}
          className="rounded-lg border border-border px-3 py-1 text-xs"
        />
      </div>

      <div className="card-soft flex-1 min-h-0 overflow-hidden p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground mb-2">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid h-full grid-cols-7 grid-rows-6 gap-1">
          {emptyDays.map((_, i) => <div key={`empty-${i}`} className="rounded-md" />)}
          {days.map(day => {
            const dateStr = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const st = map[dateStr];
            const cls = getDateClass(day);
            return (
              <div key={dateStr} className={`rounded-md grid place-items-center text-[11px] font-semibold ${cls}`}>
                {day}
              </div>
            );
          })}
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
