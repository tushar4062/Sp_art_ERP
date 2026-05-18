"use client";

import { ReactNode } from "react";
import {
  LayoutDashboard, ClipboardCheck, CalendarOff, Palette, CalendarDays, MessageSquare, TrendingUp, ClipboardList
} from "lucide-react";
import { RoleLayout, NavItem } from "@/components/layouts/RoleLayout";
import { RequireRole } from "@/components/layouts/RoleLayout";

const seniorNav: NavItem[] = [
  { to: "/senior-teacher", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/senior-teacher/classes", label: "My Classes", icon: CalendarDays },
  { to: "/senior-teacher/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/senior-teacher/drawing-tests", label: "Drawing Tests", icon: Palette },
  { to: "/senior-teacher/progress", label: "Student Progress", icon: TrendingUp },
  { to: "/senior-teacher/slot-requests", label: "Slot Requests", icon: ClipboardList },
  { to: "/senior-teacher/leave", label: "Leave", icon: CalendarOff },
  { to: "/senior-teacher/chat", label: "Chat", icon: MessageSquare },
];

export default function SeniorTeacherLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="senior-teacher">
      <RoleLayout navItems={seniorNav} role="senior-teacher">
        {children}
      </RoleLayout>
    </RequireRole>
  );
}
