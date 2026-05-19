"use client";

import { ReactNode } from "react";
import {
  LayoutDashboard, Users, GraduationCap, ClipboardCheck, TrendingUp,
  Sparkles, Wallet, Boxes, CreditCard, Award, Bell, MessageSquareHeart, MessageSquare, Shield
} from "lucide-react";
import { RoleLayout, NavItem } from "@/components/layouts/RoleLayout";
import { RequireRole } from "@/components/layouts/RoleLayout";

const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/credentials", label: "Credentials", icon: Shield },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  { to: "/admin/senior-teachers", label: "Senior Teachers", icon: GraduationCap },
  { to: "/admin/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/admin/progress", label: "Progress Reports", icon: TrendingUp },
  { to: "/admin/crm", label: "CRM Leads", icon: Sparkles },
  { to: "/admin/payroll", label: "HR & Payroll", icon: Wallet },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/billing", label: "Billing", icon: CreditCard },
  { to: "/admin/certificates", label: "Certificates", icon: Award },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/feedback", label: "Parent Feedback", icon: MessageSquareHeart },
  { to: "/admin/chat", label: "Chat", icon: MessageSquare },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="admin">
      <RoleLayout navItems={adminNav} role="admin">
        {children}
      </RoleLayout>
    </RequireRole>
  );
}
