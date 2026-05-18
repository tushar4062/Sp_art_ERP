"use client";

import { ReactNode } from "react";
import {
  LayoutDashboard, CalendarDays, Star, ClipboardList, ClipboardCheck, Wallet, Award, MessageSquareHeart, MessageSquare
} from "lucide-react";
import { RoleLayout, NavItem } from "@/components/layouts/RoleLayout";
import { RequireRole } from "@/components/layouts/RoleLayout";

const studentNav: NavItem[] = [
  { to: "/student", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/student/classes", label: "My Classes", icon: CalendarDays },
  { to: "/student/scores", label: "My Scores", icon: Star },
  { to: "/student/request-slot", label: "Request Slot", icon: ClipboardList },
  { to: "/student/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/student/fees", label: "Fees", icon: Wallet },
  { to: "/student/certificates", label: "Certificates", icon: Award },
  { to: "/student/feedback", label: "Feedback", icon: MessageSquareHeart },
  { to: "/student/chat", label: "Chat", icon: MessageSquare },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="student">
      <RoleLayout navItems={studentNav} role="student">
        {children}
      </RoleLayout>
    </RequireRole>
  );
}
