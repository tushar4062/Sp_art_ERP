"use client";

import { ReactNode } from "react";
import {
  LayoutDashboard, ClipboardCheck, CalendarOff, Palette, CalendarDays, MessageSquare, TrendingUp, ClipboardList
} from "lucide-react";
import { RoleLayout, NavItem } from "@/components/layouts/RoleLayout";
import { RequireRole } from "@/components/layouts/RoleLayout";

const seniorNav: NavItem[] = [
  { to: "/admin/senior-teacher", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/senior-teacher/classes", label: "My Classes", icon: CalendarDays },
  { to: "/admin/senior-teacher/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/admin/senior-teacher/drawing-tests", label: "Drawing Tests", icon: Palette },
  { to: "/admin/senior-teacher/progress", label: "Student Progress", icon: TrendingUp },
  { to: "/admin/senior-teacher/slot-requests", label: "Slot Requests", icon: ClipboardList },
  { to: "/admin/senior-teacher/leave", label: "Leave", icon: CalendarOff },
  { to: "/admin/senior-teacher/chat", label: "Chat", icon: MessageSquare },
];

export default function AdminSeniorTeacherLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="admin">
      <RoleLayout navItems={seniorNav} role="admin">
        {children}
      </RoleLayout>
    </RequireRole>
  );
}
