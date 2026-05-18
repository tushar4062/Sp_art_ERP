"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Shield, GraduationCap, Users, BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type RoleOption = { id: Role; title: string; desc: string; icon: React.ComponentType<{className?: string}>; gradient: string; demoEmail: string };
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "anjali@littlebrushes.in";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "demo1234";

const ROLES: RoleOption[] = [
  { id: "super-admin",    title: "Super Admin",    desc: "Manage all institutes",   icon: Crown,         gradient: "from-secondary to-secondary/70", demoEmail: "vikram@littlebrushes.in" },
  { id: "admin",          title: "Admin",          desc: "Run the academy",         icon: Shield,        gradient: "from-primary to-accent",         demoEmail: ADMIN_EMAIL },
  { id: "senior-teacher", title: "Senior Teacher", desc: "Approvals & oversight",   icon: GraduationCap, gradient: "from-accent to-primary",          demoEmail: "rahul@littlebrushes.in" },
  { id: "teacher",        title: "Teacher",        desc: "Classes & attendance",    icon: Users,         gradient: "from-success to-info",            demoEmail: "sneha@littlebrushes.in" },
  { id: "student",        title: "Student",        desc: "Classes, fees, certs",    icon: BookOpen,      gradient: "from-info to-secondary",          demoEmail: "aarav@kid.in" },
];

export default function Login() {
  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill in both fields");

    if (role === "teacher") {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();
      if (!response.ok) {
        return toast.error(data?.error || "Teacher login failed");
      }

      login(role, email, data.user.name);
      toast.success(`Welcome, ${data.user.name}!`);
      router.push(`/${role}`);
      return;
    }

    if (role === "admin" && (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD)) {
      return toast.error("Invalid admin credentials");
    }

    login(role, email);
    toast.success(`Welcome, ${ROLES.find(r => r.id === role)?.title}!`);
    router.push(`/${role}`);
  }

  function pickRole(r: Role) {
    setRole(r);
    setEmail(r === "admin" ? ADMIN_EMAIL : ROLES.find(x => x.id === r)!.demoEmail);
    setPassword("");
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left brand panel */}
      <div className="lg:w-1/2 relative overflow-hidden gradient-party text-white p-8 lg:p-12 flex flex-col justify-between min-h-[40vh] lg:min-h-screen">
        <DecorBlobs />
        <div className="relative">
          <Logo size={48} />
        </div>
        <div className="relative space-y-4 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> All-in-one ERP
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-bold leading-tight">
            Where every child paints their world. 🎨
          </h1>
          <p className="text-white/90 text-base">
            Manage students, teachers, classes, fees, inventory and certificates — all in one playful, powerful workspace.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-3 max-w-md">
          {[
            { k: "Students", v: "156+" },
            { k: "Classes",  v: "24/wk" },
            { k: "Modules",  v: "10" },
          ].map(s => (
            <div key={s.k} className="rounded-xl bg-white/15 backdrop-blur p-3">
              <div className="font-display text-2xl font-bold">{s.v}</div>
              <div className="text-xs opacity-90 font-semibold">{s.k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg space-y-6">
          <div>
            <h2 className="font-display text-3xl font-bold text-secondary">Welcome back!</h2>
            <p className="text-muted-foreground mt-1">Pick a role to sign in. Teacher login validates against database credentials.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {ROLES.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => pickRole(r.id)}
                className={cn(
                  "relative rounded-2xl p-3 text-left transition-all border-2",
                  role === r.id
                    ? "border-transparent shadow-pop scale-[1.02]"
                    : "border-border/60 bg-card hover:border-primary/40",
                )}
              >
                {role === r.id && (
                  <div className={cn("absolute inset-0 rounded-2xl bg-gradient-to-br opacity-95", r.gradient)} />
                )}
                <div className={cn("relative", role === r.id && "text-white")}>
                  <div className={cn("inline-grid place-items-center w-9 h-9 rounded-xl mb-2",
                    role === r.id ? "bg-white/25" : "bg-muted")}>
                    <r.icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="font-display font-bold text-sm">{r.title}</div>
                  <div className={cn("text-[11px] mt-0.5", role === r.id ? "text-white/85" : "text-muted-foreground")}>{r.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="card-soft p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="rounded-xl h-11" />
              <p className="text-[11px] text-muted-foreground">
                {role === "admin"
                  ? "Admin login uses the env credentials you configured."
                  : "Demo: any password unlocks the dashboard."}
              </p>
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl gradient-primary text-white font-bold border-0 hover:opacity-95 shadow-pop">
              Enter dashboard <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            © {new Date().getFullYear()} Little Brushes Art Academy
          </p>
        </div>
      </div>
    </div>
  );
}

function DecorBlobs() {
  return (
    <>
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute bottom-10 -left-10 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
      <svg className="absolute top-1/3 right-10 w-24 h-24 opacity-30 animate-float" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="35" fill="none" stroke="white" strokeWidth="3" strokeDasharray="6 8" />
      </svg>
    </>
  );
}
