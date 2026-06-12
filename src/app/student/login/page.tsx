"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STUDENT_EMAIL = "aarav@kid.in";

export default function StudentLoginPage() {
  const [email, setEmail] = useState(STUDENT_EMAIL);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill in both fields");

    setSubmitting(true);
    try {
      const response = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Student login failed");
      }
      login("student", data.data.user.email, data.data.user.name);
      toast.success(`Welcome, ${data.data.user.name}!`);
      router.push("/student/dashboard");
    } catch (error) {
      toast.error((error as Error).message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
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

      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg space-y-6">
          <div>
            <h2 className="font-display text-3xl font-bold text-secondary">Student Login</h2>
            <p className="text-muted-foreground mt-1">Enter your credentials to access your portal</p>
          </div>

          <form onSubmit={handleSubmit} className="card-soft p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="student-email">Email</Label>
              <Input id="student-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="student-password">Password</Label>
              <Input id="student-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="rounded-xl h-11" />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl gradient-primary text-white font-bold border-0 hover:opacity-95 shadow-pop"
            >
              {submitting ? "Signing in…" : "Enter Student Portal"} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="text-sm text-center text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Staff login? Go back →
            </Link>
          </div>

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
