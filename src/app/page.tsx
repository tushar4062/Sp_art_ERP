"use client";

import { useRouter } from "next/navigation";
import { useAuth, roleHome } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push(roleHome(user.role));
    } else {
      router.push("/login");
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin">Loading...</div>
    </div>
  );
}
