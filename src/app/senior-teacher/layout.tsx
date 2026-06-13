"use client";

import { ReactNode } from "react";
import {
  LayoutDashboard, CalendarOff, Palette, CalendarDays, MessageSquare, TrendingUp, ClipboardList, User, UserPlus, Boxes, GraduationCap, Users,
} from "lucide-react";
import { RoleLayout, NavItem, RequireRoles } from "@/components/layouts/RoleLayout";

const seniorNav: NavItem[] = [
  { to: "/senior-teacher", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/senior-teacher/teachers", label: "Teachers", icon: GraduationCap, end: false },
  { to: "/senior-teacher/students", label: "Students", icon: Users, end: false },
  { to: "/senior-teacher/batches", label: "Batches", icon: Boxes, end: false },
  { to: "/senior-teacher/classes", label: "My Classes", icon: CalendarDays },
  { to: "/senior-teacher/students", label: "Student admission", icon: Users, end: false },
  { to: "/senior-teacher/drawing-tests", label: "Drawing Tests", icon: Palette },
  { to: "/senior-teacher/progress", label: "Student Progress", icon: TrendingUp },
  { to: "/senior-teacher/slot-requests", label: "Slot Requests", icon: ClipboardList },
  { to: "/senior-teacher/leave", label: "Leave", icon: CalendarOff },
  { to: "/senior-teacher/chat", label: "Chat", icon: MessageSquare },
  { to: "/senior-teacher/profile", label: "My Profile", icon: User },
];

export default function SeniorTeacherLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRoles roles={["senior-teacher"]}>
      <RoleLayout navItems={seniorNav} role="senior-teacher">
        {children}
      </RoleLayout>
    </RequireRoles>
  );
}