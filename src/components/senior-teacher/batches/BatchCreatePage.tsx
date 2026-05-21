"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { BatchForm } from "@/components/senior-teacher/batches/BatchForm";
import { canManageBatches } from "@/lib/batch/permissions";
import { useBatchRoutes } from "@/lib/batch/useBatchRoutes";

export function BatchCreatePage() {
  const { user, hydrated } = useAuth();
  const router = useRouter();
  const routes = useBatchRoutes();

  useEffect(() => {
    if (!hydrated) return;
    if (user && !canManageBatches(user.role)) {
      console.log("[BatchCreatePage] denied role", user.role);
      toast.error("You do not have permission to create batches");
      router.replace(routes.list);
    }
  }, [user, hydrated, router, routes.list]);

  if (!hydrated || !canManageBatches(user?.role)) return null;

  return <BatchForm mode="create" />;
}
