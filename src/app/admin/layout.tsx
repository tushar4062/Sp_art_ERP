"use client";

import { ReactNode } from "react";
import {
  LayoutDashboard, Users, GraduationCap, ClipboardCheck, TrendingUp,

  Sparkles, Wallet, Boxes, CreditCard, Award, Bell, MessageSquareHeart, MessageSquare, Shield, UserPlus, Package, BookOpen, CalendarOff, HelpCircle,


} from "lucide-react";
import { RoleLayout, NavItem } from "@/components/layouts/RoleLayout";
import { RequireRole } from "@/components/layouts/RoleLayout";
import { useEnsureAdminSession } from "@/components/admin/useEnsureAdminSession";

const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/admission", label: "Admission", icon: UserPlus },
  { to: "/admin/credentials", label: "Credentials", icon: Shield },
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/enrolled", label: "Enrolled", icon: ClipboardCheck },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/queries", label: "Queries", icon: HelpCircle },
  { to: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  { to: "/admin/senior-teachers", label: "Senior Teachers", icon: GraduationCap },
  { to: "/admin/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/admin/leaves", label: "Leave Management", icon: CalendarOff },
  { to: "/admin/progress", label: "Progress Reports", icon: TrendingUp },
  { to: "/admin/crm", label: "CRM Leads", icon: Sparkles },
  { to: "/admin/payroll", label: "HR & Payroll", icon: Wallet },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/batches", label: "Batches", icon: Package, end: false },
  { to: "/admin/billing", label: "Billing", icon: CreditCard },
  { to: "/admin/offline-payments", label: "Offline Payments", icon: Wallet },
  { to: "/admin/certificates", label: "Certificates", icon: Award },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/feedback", label: "Parent Feedback", icon: MessageSquareHeart },
  { to: "/admin/chat", label: "Chat", icon: MessageSquare },
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
