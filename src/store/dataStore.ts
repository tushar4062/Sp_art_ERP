"use client";

import { useSyncExternalStore } from "react";
import {
  students as seedStudents,
  teachers as seedTeachers,
  inventoryItems as seedInventory,
  recentIssues as seedIssues,
  leads as seedLeads,
  slotRequests as seedSlots,
  leaveRequests as seedLeaves,
  payments as seedPayments,
  certificates as seedCerts,
  notificationLog as seedNotifLog,
  institutions as seedInstitutions,
  certificateTypes,
  CLASSES,
} from "@/data/mockData";

export type Student = typeof seedStudents[number] & {
  photo?: string;
  bloodGroup?: string;
  gender?: string;
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
  artTeacher?: string;
  vanFacility?: boolean;
  courseDurationMonths?: number;
  courseEndDate?: string;
};
export type Teacher = typeof seedTeachers[number];
export type InventoryItem = typeof seedInventory[number];
export type Issue = typeof seedIssues[number];
export type Lead = typeof seedLeads[number];
export type SlotReq = typeof seedSlots[number];
export type Leave = typeof seedLeaves[number];
export type Payment = typeof seedPayments[number];
export type Certificate = Omit<typeof seedCerts[number], "type"> & { type: typeof certificateTypes[number] };
export type NotifLog = typeof seedNotifLog[number];
export type Institution = typeof seedInstitutions[number];

export type DrawingScore = { duration: number; neatness: number; art: number };
export type DrawingTest = {
  id: string;
  title: string;
  studentId: string;
  studentName: string;
  teacherName: string;
  className: string;
  teacherImage: string; // data URL
  studentImage: string; // data URL
  durationMinutes: number; // time student took
  submittedAt: string;
  status: "Pending Review" | "Scored";
  studentScore?: DrawingScore;
  teacherScore?: DrawingScore;
  reviewerNotes?: string;
  reviewedAt?: string;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  fromRole: "super-admin" | "admin" | "senior-teacher" | "teacher" | "student";
  fromName: string;
  text: string;
  time: string;
};

export type FeedbackRatings = {
  teaching: number;
  communication: number;
  artisticGrowth: number;
  classroom: number;
  variety: number;
  value: number;
};
export type ParentFeedback = {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  teacherName: string;
  ratings: FeedbackRatings;
  instructorImpression: string;
  motivated: "Yes" | "Sometimes" | "No";
  motivatedExplain: string;
  informed: "Yes" | "No" | "Somewhat";
  communicationSuggestions: string;
  appreciate: string;
  improve: string;
  recommend: "Yes" | "Maybe" | "No";
  additional: string;
  submittedAt: string;
  status: "New" | "Reviewed";
};

export type ChatThread = {
  id: string;
  // participants are role identifiers — the thread shows up in any matching role inbox
  participants: ("super-admin" | "admin" | "senior-teacher" | "teacher" | "student")[];
  title: string;             // display title in the inbox (other party for that role)
  subtitle?: string;
  lastMessage: string;
  lastTime: string;
  unread: Partial<Record<"super-admin" | "admin" | "senior-teacher" | "teacher" | "student", number>>;
};

export type State = {
  students: Student[];
  teachers: Teacher[];
  inventory: InventoryItem[];
  issues: Issue[];
  leads: Lead[];
  slots: SlotReq[];
  leaves: Leave[];
  payments: Payment[];
  certificates: Certificate[];
  notifLog: NotifLog[];
  institutions: Institution[];
  drawingTests: DrawingTest[];
  threads: ChatThread[];
  chatMessages: ChatMessage[];
  feedbacks: ParentFeedback[];
};

let state: State = {
  students: [...seedStudents],
  teachers: [...seedTeachers],
  inventory: [...seedInventory],
  issues: [...seedIssues],
  leads: [...seedLeads],
  slots: [...seedSlots],
  leaves: [...seedLeaves],
  payments: [...seedPayments],
  certificates: [...seedCerts],
  notifLog: [...seedNotifLog],
  institutions: [...seedInstitutions],
  drawingTests: [],
  threads: [
    { id: "TH1", participants: ["teacher", "student"], title: "Aarav Sharma", subtitle: "Student • LBA-1001", lastMessage: "Thank you ma'am!", lastTime: "10:07 AM", unread: { teacher: 2 } },
    { id: "TH2", participants: ["teacher", "admin"], title: "Diya's Mom (Admin relay)", subtitle: "Parent inquiry", lastMessage: "Will she be at class today?", lastTime: "9:42 AM", unread: { teacher: 1, admin: 1 } },
    { id: "TH3", participants: ["teacher", "senior-teacher"], title: "Anjali Verma", subtitle: "Senior Teacher", lastMessage: "Approved your request.", lastTime: "Yesterday", unread: {} },
    { id: "TH4", participants: ["admin", "senior-teacher"], title: "Rahul Desai", subtitle: "Senior Teacher", lastMessage: "Please share the schedule.", lastTime: "Yesterday", unread: { admin: 1 } },
    { id: "TH5", participants: ["admin", "student"], title: "Aarav Sharma", subtitle: "Fee follow-up", lastMessage: "Will pay by Friday.", lastTime: "2d ago", unread: {} },
  ],
  chatMessages: [
    { id: "M1", threadId: "TH1", fromRole: "student", fromName: "Aarav Sharma", text: "Hi ma'am! When is the next watercolor class?", time: "10:02 AM" },
    { id: "M2", threadId: "TH1", fromRole: "teacher", fromName: "Sneha Kulkarni", text: "Tomorrow at 4 PM, in studio 2 🎨", time: "10:04 AM" },
    { id: "M3", threadId: "TH1", fromRole: "student", fromName: "Aarav Sharma", text: "Should I bring anything special?", time: "10:05 AM" },
    { id: "M4", threadId: "TH1", fromRole: "teacher", fromName: "Sneha Kulkarni", text: "Just your apron and a smile! 😊", time: "10:06 AM" },
    { id: "M5", threadId: "TH1", fromRole: "student", fromName: "Aarav Sharma", text: "Thank you ma'am!", time: "10:07 AM" },
    { id: "M6", threadId: "TH3", fromRole: "senior-teacher", fromName: "Anjali Verma", text: "Approved your leave request.", time: "Yesterday" },
    { id: "M7", threadId: "TH4", fromRole: "senior-teacher", fromName: "Rahul Desai", text: "Please share the schedule.", time: "Yesterday" },
    { id: "M8", threadId: "TH5", fromRole: "student", fromName: "Aarav Sharma", text: "Will pay by Friday.", time: "2d ago" },
    { id: "M9", threadId: "TH2", fromRole: "admin", fromName: "Anjali Verma", text: "Diya's mom asked: will she be at class today?", time: "9:42 AM" },
  ],
  feedbacks: [],
};

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => state;
const set = (patch: Partial<State> | ((s: State) => Partial<State>)) => {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  listeners.forEach(l => l());
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

// ---------- Actions ----------
export const actions = {
  // Students
  addStudent(input: {
    name: string; age: number; class: string;
    parent?: string; phone?: string; email?: string; dob?: string;
    photo?: string;
    bloodGroup?: string;
    gender?: string;
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
    artTeacher?: string;
    vanFacility?: boolean;
    courseDurationMonths?: number;
  }) {
    const id = `STU${String(1000 + state.students.length + 1).padStart(4, "0")}`;
    const badgeId = `Sparts-${String(1000 + state.students.length + 1).padStart(4, "0")}`;
    const today = new Date().toISOString().slice(0, 10);
    const s: Student = {
      id, badgeId, name: input.name, age: input.age,
      class: (input.class as Student["class"]) || CLASSES[0],
      parent: input.parent || input.fatherName || input.motherName || "—",
      phone: input.phone || "",
      email: input.email || `${input.name.toLowerCase().replace(/\s+/g, ".")}@kid.in`,
      dob: input.dob || today,
      enrolled: today,
      feeStatus: "Pending",
      totalFee: 18000,
      paidFee: 0,
      status: "Active",
      isBirthdayToday: false,
      photo: input.photo || "",
      bloodGroup: input.bloodGroup || "",
      gender: input.gender || "",
      school: input.school || "",
      college: input.college || "",
      occupation: input.occupation || "",
      fatherName: input.fatherName || "",
      fatherMobile: input.fatherMobile || "",
      motherName: input.motherName || "",
      motherMobile: input.motherMobile || "",
      address: input.address || "",
      currentCourse: input.currentCourse || "",
      batchDays: input.batchDays || "",
      batchTime: input.batchTime || "",
      artTeacher: input.artTeacher || "",
      vanFacility: !!input.vanFacility,
      courseDurationMonths: input.courseDurationMonths || 12,
      courseEndDate: (() => {
        const months = input.courseDurationMonths || 12;
        const d = new Date(); d.setMonth(d.getMonth() + months);
        return d.toISOString().slice(0, 10);
      })(),
    };
    set(st => ({ students: [s as Student, ...st.students] }));
    return s;
  },
  removeStudent(id: string) {
    set(st => ({ students: st.students.filter(s => s.id !== id) }));
  },

  // Teachers
  addTeacher(input: { name: string; email?: string; phone?: string; specialization: Teacher["specialization"]; experience?: number }) {
    const id = `TCH${String(2000 + state.teachers.length + 1).padStart(4, "0")}`;
    const t: Teacher = {
      id, name: input.name,
      specialization: input.specialization,
      email: input.email || `${input.name.toLowerCase().replace(/\s+/g, ".")}@littlebrushes.in`,
      phone: input.phone || "",
      experience: input.experience || 1,
      status: "Active",
      classes: [CLASSES[0], CLASSES[1]],
      isSenior: false,
    };
    set(st => ({ teachers: [t, ...st.teachers] }));
    return t;
  },

  // Leads
  addLead(input: { child: string; parent?: string; phone?: string; source?: string }) {
    const id = `LD${String(state.leads.length + 1).padStart(3, "0")}`;
    const l: Lead = {
      id, child: input.child,
      parent: input.parent || "—",
      phone: input.phone || "",
      source: input.source || "Walk-in",
      counselor: "Pooja Nair",
      stage: "New Enquiry",
    };
    set(st => ({ leads: [l, ...st.leads] }));
    return l;
  },
  moveLead(id: string, stage: Lead["stage"]) {
    set(st => ({ leads: st.leads.map(l => l.id === id ? { ...l, stage } : l) }));
    // If enrolled, auto-create student
    const lead = state.leads.find(l => l.id === id);
    if (lead && stage === "Enrolled" && !state.students.some(s => s.name === lead.child)) {
      actions.addStudent({ name: lead.child, age: 8, class: CLASSES[1], parent: lead.parent, phone: lead.phone });
    }
  },

  // Slot requests
  addSlotRequest(input: { studentId: string; student: string; badge: string; class: string; time: string; date: string }) {
    const id = `SR${String(state.slots.length + 1).padStart(3, "0")}`;
    const r: SlotReq = { id, ...input, status: "Pending" };
    set(st => ({ slots: [r, ...st.slots] }));
    return r;
  },
  setSlotStatus(id: string, status: SlotReq["status"]) {
    set(st => ({ slots: st.slots.map(r => r.id === id ? { ...r, status } : r) }));
  },

  // Leaves
  addLeave(input: { staff: string; type: string; from: string; to: string; reason: string }) {
    const id = `LV${String(state.leaves.length + 1).padStart(3, "0")}`;
    const l: Leave = { id, ...input, status: "Pending" };
    set(st => ({ leaves: [l, ...st.leaves] }));
    return l;
  },
  setLeaveStatus(id: string, status: Leave["status"]) {
    set(st => ({ leaves: st.leaves.map(l => l.id === id ? { ...l, status } : l) }));
  },

  // Inventory
  issueItem(input: { itemId: string; studentName: string; qty: number }) {
    const item = state.inventory.find(i => i.id === input.itemId);
    if (!item) return;
    const newStock = Math.max(0, item.stock - input.qty);
    set(st => ({
      inventory: st.inventory.map(i => i.id === input.itemId ? { ...i, stock: newStock, status: newStock <= i.reorder ? "Low Stock" : "In Stock" } : i),
      issues: [{ date: new Date().toISOString().slice(0, 10), student: input.studentName, item: item.name, qty: input.qty }, ...st.issues],
    }));
  },

  // Payments
  recordPayment(input: { studentName: string; amount: number; mode: "Online" | "Cash" }) {
    const id = `PAY${String(state.payments.length + 1).padStart(3, "0")}`;
    const p: Payment = { id, date: new Date().toISOString().slice(0, 10), student: input.studentName, amount: input.amount, mode: input.mode, status: "Success" };
    set(st => {
      const students = st.students.map(s => {
        if (s.name !== input.studentName) return s;
        const paidFee = Math.min(s.totalFee, s.paidFee + input.amount);
        const feeStatus: Student["feeStatus"] = paidFee >= s.totalFee ? "Paid" : "Pending";
        return { ...s, paidFee, feeStatus };
      });
      return { payments: [p, ...st.payments], students };
    });
    return p;
  },

  // Certificates
  issueCertificate(input: { studentId: string; student: string; type: Certificate["type"]; course: string }) {
    const id = `CRT${Date.now().toString(36)}`;
    const c: Certificate = {
      id,
      studentId: input.studentId,
      student: input.student,
      type: input.type,
      course: input.course,
      issued: new Date().toISOString().slice(0, 10),
    };
    set(st => ({ certificates: [c, ...st.certificates] }));
    return c;
  },

  // Notifications
  sendNotification(input: { target: string; channel: string; message: string }) {
    const id = state.notifLog.length + 1;
    const sent = new Date().toISOString().slice(0, 16).replace("T", " ");
    set(st => ({ notifLog: [{ id, ...input, sent }, ...st.notifLog] }));
  },

  // Institutions
  addInstitution(input: { name: string; city: string; plan: string; students?: number }) {
    const id = `INST${String(state.institutions.length + 1).padStart(2, "0")}`;
    const i: Institution = { id, name: input.name, city: input.city, plan: input.plan, students: input.students || 0, status: "Trial" };
    set(st => ({ institutions: [i, ...st.institutions] }));
    return i;
  },

  // Chat
  sendChatMessage(input: { threadId: string; fromRole: ChatMessage["fromRole"]; fromName: string; text: string }) {
    if (!input.text.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const m: ChatMessage = {
      id: `M${Date.now().toString(36)}`,
      threadId: input.threadId,
      fromRole: input.fromRole,
      fromName: input.fromName,
      text: input.text.trim(),
      time,
    };
    set(st => ({
      chatMessages: [...st.chatMessages, m],
      threads: st.threads.map(t => {
        if (t.id !== input.threadId) return t;
        const unread = { ...t.unread };
        // Mark unread for every participant role except the sender
        t.participants.forEach(role => {
          if (role !== input.fromRole) unread[role] = (unread[role] || 0) + 1;
        });
        unread[input.fromRole] = 0;
        return { ...t, lastMessage: m.text, lastTime: time, unread };
      }),
    }));
    return m;
  },
  markThreadRead(threadId: string, role: ChatMessage["fromRole"]) {
    const thread = state.threads.find(t => t.id === threadId);
    if (!thread || (thread.unread[role] ?? 0) === 0) return;
    set(st => ({
      threads: st.threads.map(t =>
        t.id === threadId ? { ...t, unread: { ...t.unread, [role]: 0 } } : t,
      ),
    }));
  },
  createChatThread(input: { participants: ChatMessage["fromRole"][]; title: string; subtitle?: string }) {
    const id = `TH${state.threads.length + 1}`;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const t: ChatThread = { id, participants: input.participants, title: input.title, subtitle: input.subtitle, lastMessage: "—", lastTime: time, unread: {} };
    set(st => ({ threads: [t, ...st.threads] }));
    return t;
  },

  // Drawing tests
  submitDrawingTest(input: {
    title: string;
    studentId: string;
    studentName: string;
    teacherName: string;
    className: string;
    teacherImage: string;
    studentImage: string;
    durationMinutes: number;
  }) {
    const id = `DT${String(state.drawingTests.length + 1).padStart(3, "0")}`;
    const t: DrawingTest = {
      id,
      ...input,
      submittedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      status: "Pending Review",
    };
    set(st => ({ drawingTests: [t, ...st.drawingTests] }));
    return t;
  },
  scoreDrawingTest(id: string, input: { studentScore: DrawingScore; teacherScore: DrawingScore; notes?: string }) {
    set(st => ({
      drawingTests: st.drawingTests.map(t =>
        t.id === id
          ? { ...t, ...input, reviewerNotes: input.notes, status: "Scored", reviewedAt: new Date().toISOString().slice(0, 16).replace("T", " ") }
          : t,
      ),
    }));
  },

  // Parent feedback
  submitFeedback(input: Omit<ParentFeedback, "id" | "submittedAt" | "status">) {
    const id = `FB${String(state.feedbacks.length + 1).padStart(3, "0")}`;
    const f: ParentFeedback = {
      ...input,
      id,
      submittedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      status: "New",
    };
    set(st => ({ feedbacks: [f, ...st.feedbacks] }));
    return f;
  },
  markFeedbackReviewed(id: string) {
    set(st => ({ feedbacks: st.feedbacks.map(f => f.id === id ? { ...f, status: "Reviewed" } : f) }));
  },
};
