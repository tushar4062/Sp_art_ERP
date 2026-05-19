"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Role, ROLE_LABELS } from "@/data/mockData";

type User = { name: string; role: Role; email: string };

type AuthCtx = {
  user: User | null;
  login: (role: Role, email: string, name?: string) => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

const ROLE_HOMES: Record<Role, string> = {
  "super-admin": "/super-admin",
  "admin": "/admin",
  "senior-teacher": "/senior-teacher",
  "teacher": "/teacher",
  "student": "/student",
};

export function roleHome(role: Role) { return ROLE_HOMES[role]; }

const ROLE_NAMES: Record<Role, string> = {
  "super-admin": "Vikram Mehta",
  "admin": "Anjali Verma",
  "senior-teacher": "Rahul Desai",
  "teacher": "Sneha Kulkarni",
  "student": "Aarav Sharma",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { const raw = localStorage.getItem("lba.user"); return raw ? JSON.parse(raw) : null; } catch { return null; }
  });

  useEffect(() => {
    if (user) localStorage.setItem("lba.user", JSON.stringify(user));
    else localStorage.removeItem("lba.user");
  }, [user]);

  const value = useMemo<AuthCtx>(() => ({
    user,
    login: (role, email, name) => setUser({ role, email, name: name ?? ROLE_NAMES[role] }),
    logout: () => setUser(null),
  }), [user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) {
    return {
      user: null,
      login: () => {},
      logout: () => {},
    };
  }
  return v;
}

export { ROLE_LABELS };
