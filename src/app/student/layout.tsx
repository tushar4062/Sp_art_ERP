"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, Star, ClipboardList, Wallet, Award, MessageSquareHeart, MessageSquare, User, BookOpen, Gift
} from "lucide-react";
import { RoleLayout, NavItem } from "@/components/layouts/RoleLayout";
import { RequireRole } from "@/components/layouts/RoleLayout";

const studentNav: NavItem[] = [
  { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/student/profile", label: "My Profile", icon: User },
  { to: "/student/courses", label: "Courses", icon: BookOpen },
  { to: "/student/referrals", label: "My Referrals", icon: Gift },
  { to: "/student/classes", label: "My Classes", icon: CalendarDays },
  { to: "/student/scores", label: "My Scores", icon: Star },
  { to: "/student/request-slot", label: "Request Slot", icon: ClipboardList },
  { to: "/student/attendance", label: "Attendance", icon: ClipboardList },
  { to: "/student/fees", label: "Fees", icon: Wallet },
  { to: "/student/certificates", label: "Certificates", icon: Award },
  { to: "/student/feedback", label: "Feedback", icon: MessageSquareHeart },
  { to: "/student/chat", label: "Chat", icon: MessageSquare },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/student/login")) {
    return <>{children}</>;
  }

  return (
    <RequireRole role="student">
      <RoleLayout navItems={studentNav} role="student">
        {children}
      </RoleLayout>
    </RequireRole>
  );
}
