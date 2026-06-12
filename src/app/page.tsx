"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { roleHome } from "@/contexts/AuthContext.exports";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { user, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated) return;

    if (user) {
      router.push(roleHome(user.role));
    } else {
      router.push("/student/login");
    }
  }, [user, hydrated, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin">Loading...</div>
    </div>
  );
}
