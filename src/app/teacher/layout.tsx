"use client";

import { ReactNode } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardCheck,
  Palette,
  TrendingUp,
  ClipboardList,
  CalendarOff,
  MessageSquare,
  User,
  Boxes,
} from "lucide-react";
import { RoleLayout, NavItem } from "@/components/layouts/RoleLayout";
import { RequireRole } from "@/components/layouts/RoleLayout";

const teacherNav: NavItem[] = [
  { to: "/teacher", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/teacher/batches", label: "My Batches", icon: Boxes, end: false },
  { to: "/teacher/profile", label: "My Profile", icon: User },
  { to: "/teacher/classes", label: "My Classes", icon: CalendarDays },
  { to: "/teacher/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/teacher/drawing-tests", label: "Drawing Tests", icon: Palette },
  { to: "/teacher/progress", label: "Student Progress", icon: TrendingUp },
  { to: "/teacher/slot-requests", label: "Slot Requests", icon: ClipboardList },
  { to: "/teacher/leave", label: "Leave", icon: CalendarOff },
  { to: "/teacher/chat", label: "Chat", icon: MessageSquare },
];

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="teacher">
      <RoleLayout navItems={teacherNav} role="teacher">
        {children}
      </RoleLayout>
    </RequireRole>
  );
}
