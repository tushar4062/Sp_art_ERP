"use client";

import { ReactNode } from "react";
import {
  LayoutDashboard, Building2, CreditCard, BarChart3
} from "lucide-react";
import { RoleLayout, NavItem } from "@/components/layouts/RoleLayout";
import { RequireRole } from "@/components/layouts/RoleLayout";

const superAdminNav: NavItem[] = [
  { to: "/super-admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/super-admin/institutions", label: "Institutions", icon: Building2 },
  { to: "/super-admin/billing", label: "Billing", icon: CreditCard },
  { to: "/super-admin/settings", label: "Settings", icon: BarChart3 },
  { to: "/super-admin/reports", label: "Reports", icon: BarChart3 },
];

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="super-admin">
      <RoleLayout navItems={superAdminNav} role="super-admin">
        {children}
      </RoleLayout>
    </RequireRole>
  );
}
