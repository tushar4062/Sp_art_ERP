"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { AdminStaffAttendancePreviewPage } from "@/components/attendance/AdminStaffAttendancePreviewPage";
import { Skeleton } from "@/components/ui/skeleton";

function PreviewContent({ previewId }: { previewId: string }) {
  const searchParams = useSearchParams();
  const role = searchParams.get("role");
  const staffLabel = role === "senior-teacher" ? "Senior Teacher" : "Teacher";
  return <AdminStaffAttendancePreviewPage previewId={previewId} staffLabel={staffLabel} />;
}

export default function AdminAttendanceReportPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      }
    >
      <PreviewContent previewId={id} />
    </Suspense>
  );
}
