/* eslint-disable react-refresh/only-export-components */

"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Role, ROLE_LABELS } from "@/data/mockData";

type User = { name: string; role: Role; email: string };

type AuthCtx = {
  user: User | null;
  hydrated: boolean;
  login: (role: Role, email: string, name?: string) => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

const ROLE_HOMES: Record<Role, string> = {
  "super-admin": "/super-admin",
  "admin": "/admin",
  "senior-teacher": "/senior-teacher",
  "teacher": "/teacher",
  "student": "/student/dashboard",
};

export function roleHome(role: Role) {
  return ROLE_HOMES[role];
}

const ROLE_NAMES: Record<Role, string> = {
  "super-admin": "Vikram Mehta",
  "admin": "Anjali Verma",
  "senior-teacher": "Rahul Desai",
  "teacher": "Sneha Kulkarni",
  "student": "Aarav Sharma",
};

const STORAGE_KEY = "lba.user";

function readStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(readStoredUser());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      hydrated,
      login: (role, email, name) =>
        setUser({ role, email, name: name ?? ROLE_NAMES[role] }),
      logout: () => setUser(null),
    }),
    [user, hydrated],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) {
    return {
      user: null,
      hydrated: false,
      login: () => {},
      logout: () => {},
    };
  }
  return v;
}

export { ROLE_LABELS };
