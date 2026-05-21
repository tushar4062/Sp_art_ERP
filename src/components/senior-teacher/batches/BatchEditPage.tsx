"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { BatchForm } from "@/components/senior-teacher/batches/BatchForm";
import type { SerializedBatch } from "@/lib/batch/types";
import { batchFetch } from "@/lib/batch/batchFetch";
import { canManageBatches } from "@/lib/batch/permissions";
import { useBatchRoutes } from "@/lib/batch/useBatchRoutes";
import { Skeleton } from "@/components/ui/skeleton";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";

export function BatchEditPage({ id }: { id: string }) {
  const { user, hydrated } = useAuth();
  const router = useRouter();
  const routes = useBatchRoutes();
  const [batch, setBatch] = useState<SerializedBatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (user && !canManageBatches(user.role)) {
      console.log("[BatchEditPage] denied role", user.role);
      toast.error("You do not have permission to edit batches");
      router.replace(routes.list);
    }
  }, [user, hydrated, router, routes.list]);

  useEffect(() => {
    if (!hydrated || !canManageBatches(user?.role)) return;
    (async () => {
      try {
        const res = await batchFetch(`/api/senior-teacher/batches/${id}`);
        const json = await res.json();
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setBatch(json.data.batch);
      } catch (e) {
        toast.error(messageFromUnknown(e, "Failed to load batch"));
        router.push(routes.list);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, hydrated, user, router, routes.list]);

  if (!hydrated || !canManageBatches(user?.role)) return null;
  if (loading || !batch) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full max-w-lg rounded-xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  return <BatchForm mode="edit" batchId={id} initial={batch} />;
}
