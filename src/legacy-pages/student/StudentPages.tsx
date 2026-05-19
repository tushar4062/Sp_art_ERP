"use client";

import { useState } from "react";
import { CalendarDays, Wallet, Award, Clock, CreditCard, Download, Send, AlarmClock } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusPill } from "@/components/shared/StatusPill";
import { BirthdayBanner } from "@/components/shared/BirthdayBanner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { todaysClasses, makeAttendance } from "@/data/mockData";
import { useStore, actions, type Student } from "@/store/dataStore";
import { CertificatePreview } from "@/pages/admin/Certificates";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CLASSES } from "@/data/mockData";
export { ChatPage } from "@/pages/senior-teacher/SeniorTeacherPages";

function useMe() {
  const { user } = useAuth();
  const students = useStore(s => s.students);
  const student =
    students.find(s => user?.email && s.email?.toLowerCase() === user.email.toLowerCase()) ??
    students[0];

  const fallback = {
    id: "",
    name: user?.name ?? "Student",
    badgeId: "",
    class: CLASSES[0],
    email: user?.email ?? "",
    totalFee: 0,
    paidFee: 0,
    isBirthdayToday: false,
  };

  if (!student) return fallback;

  return {
    ...student,
    name: student.name || user?.name || "Student",
    totalFee: Number(student.totalFee) || 0,
    paidFee: Number(student.paidFee) || 0,
    isBirthdayToday: false,
  };
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
  const me = useMe();
  const att = makeAttendance(0);
  const map = Object.fromEntries(att.map(a => [a.date, a.status]));
  const today = new Date();
  const days = eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });
  const pct = Math.round(att.filter(a => a.status === "Present").length / att.length * 100);

  return (
    <div className="space-y-6">
      <PageHeader title="My Attendance" subtitle={format(today,"MMMM yyyy")} />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card-soft p-5">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground mb-2">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: days[0].getDay() }).map((_, i) => <div key={i} />)}
            {days.map(d => {
              const key = format(d, "yyyy-MM-dd");
              const st = map[key];
              const cls = st === "Present" ? "bg-success text-success-foreground" : st === "Late" ? "bg-warning text-warning-foreground" : st === "Absent" ? "bg-destructive text-destructive-foreground" : isSunday(d) ? "bg-muted text-muted-foreground" : "bg-muted/40";
              return <div key={key} className={`aspect-square rounded-lg grid place-items-center text-sm font-bold ${cls}`}>{format(d,"d")}</div>;
            })}
          </div>
        </div>
        <div className="space-y-3">
          <div className="card-soft p-5 text-center">
            <div className="text-xs text-muted-foreground font-semibold">Monthly attendance</div>
            <div className="font-display font-bold text-5xl text-success mt-2">{pct}%</div>
          </div>
          <div className="card-soft p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-success" /> Present</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-warning" /> Late</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-destructive" /> Absent</div>
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
  const totalFee = me?.totalFee ?? 0;
  const paidFee = me?.paidFee ?? 0;
  const balance = totalFee - paidFee;
  const myPays = payments.filter(p => p.student === me.name);
  return (
    <div className="space-y-6">
      <PageHeader title="My Fees" subtitle="Payments and dues" />
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Total Fee" value={`₹${totalFee.toLocaleString()}`} icon={Wallet} tone="info" />
        <StatCard label="Paid" value={`₹${paidFee.toLocaleString()}`} icon={CreditCard} tone="success" />
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
