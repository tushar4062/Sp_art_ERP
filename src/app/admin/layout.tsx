"use client";

import { ReactNode } from "react";
import {
  LayoutDashboard, Users, GraduationCap, ClipboardCheck, TrendingUp,

  Sparkles, Wallet, Boxes, CreditCard, Award, Bell, MessageSquareHeart, MessageSquare, Shield, UserPlus, Package, BookOpen, CalendarOff, HelpCircle, Gift,


} from "lucide-react";
import { RoleLayout, NavItem, NavSection } from "@/components/layouts/RoleLayout";
import { RequireRole } from "@/components/layouts/RoleLayout";
import { useEnsureAdminSession } from "@/components/admin/useEnsureAdminSession";

const adminNav: Array<NavItem | NavSection> = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  {
    title: "Student Management",
    items: [
      { to: "/admin/admission", label: "Admission", icon: UserPlus },
      { to: "/admin/students", label: "Students", icon: Users },
      { to: "/admin/enrolled", label: "Enrolled", icon: ClipboardCheck },
      { to: "/admin/referrals", label: "Referral Management", icon: Gift },
      { to: "/admin/credentials", label: "Credentials", icon: Shield },
      { to: "/admin/queries", label: "Queries", icon: HelpCircle },
    ],
  },
  {
    title: "Academic Management",
    items: [
      { to: "/admin/courses", label: "Courses", icon: BookOpen },
      { to: "/admin/batches", label: "Batches", icon: Package, end: false },
      { to: "/admin/attendance", label: "Attendance", icon: ClipboardCheck },
      { to: "/admin/progress", label: "Progress Reports", icon: TrendingUp },
      { to: "/admin/certificates", label: "Certificates", icon: Award },
    ],
  },
  {
    title: "Teacher Management",
    items: [
      { to: "/admin/teachers", label: "Teachers", icon: GraduationCap },
      { to: "/admin/senior-teachers", label: "Senior Teachers", icon: GraduationCap },
      { to: "/admin/leaves", label: "Leave Management", icon: CalendarOff },
    ],
  },
  {
    title: "Finance & Operations",
    items: [
      { to: "/admin/billing", label: "Billing", icon: CreditCard },
      { to: "/admin/offline-payments", label: "Offline Payments", icon: Wallet },
      { to: "/admin/payroll", label: "HR & Payroll", icon: Wallet },
      { to: "/admin/inventory", label: "Inventory", icon: Boxes },
    ],
  },
  {
    title: "Communication & CRM",
    items: [
      { to: "/admin/crm", label: "CRM Leads", icon: Sparkles },
      { to: "/admin/notifications", label: "Notifications", icon: Bell },
      { to: "/admin/feedback", label: "Parent Feedback", icon: MessageSquareHeart },
      { to: "/admin/chat", label: "Chat", icon: MessageSquare },
    ],
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { ready } = useEnsureAdminSession();

  return (
    <RequireRole role="admin">
      <RoleLayout navItems={adminNav} role="admin">
        {ready ? children : (
          <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
            Verifying admin session…
          </div>
        )}
      </RoleLayout>
    </RequireRole>
  );
}
