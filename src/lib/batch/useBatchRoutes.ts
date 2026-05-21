"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { batchPortalFromPath, batchRoutes } from "@/lib/batch/routes";

export function useBatchRoutes() {
  const pathname = usePathname();
  const portal = batchPortalFromPath(pathname);
  return useMemo(() => batchRoutes(portal), [portal]);
}
