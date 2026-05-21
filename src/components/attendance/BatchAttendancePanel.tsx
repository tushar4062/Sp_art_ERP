"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { batchFetch } from "@/lib/batch/batchFetch";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";

type RosterStat = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  present: number;
  absent: number;
  percent: number;
};

type PanelData = {
  summary: { present: number; absent: number; percent: number; sessions: number };
  rosterStats: RosterStat[];
};

export function BatchAttendancePanel({ batchId }: { batchId: string }) {
  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await batchFetch(`/api/attendance/batches/${batchId}`);
        const json = await parseJsonResponse<{ data?: PanelData }>(res);
        if (res.ok && json.data) setData(json.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [batchId]);

  if (loading) {
    return <Skeleton className="h-48 rounded-2xl" />;
  }

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">Attendance data will appear when teachers mark sessions.</p>
    );
  }

  return (
    <div className="space-y-4">
      <dl className="text-sm grid grid-cols-2 gap-2">
        <div className="flex justify-between col-span-2 sm:col-span-1">
          <dt className="text-muted-foreground">Present (all time)</dt>
          <dd className="font-medium text-emerald-700">{data.summary.present}</dd>
        </div>
        <div className="flex justify-between col-span-2 sm:col-span-1">
          <dt className="text-muted-foreground">Absent (all time)</dt>
          <dd className="font-medium text-red-700">{data.summary.absent}</dd>
        </div>
        <div className="flex justify-between col-span-2 sm:col-span-1">
          <dt className="text-muted-foreground">Sessions</dt>
          <dd className="font-medium">{data.summary.sessions}</dd>
        </div>
        <div className="flex justify-between col-span-2 sm:col-span-1">
          <dt className="text-muted-foreground">Overall %</dt>
          <dd className="font-medium">{data.summary.percent}%</dd>
        </div>
      </dl>

      {data.rosterStats.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rosterStats.slice(0, 10).map(s => (
                <TableRow key={s.studentId}>
                  <TableCell className="font-medium">{s.studentName}</TableCell>
                  <TableCell className="text-emerald-700">{s.present}</TableCell>
                  <TableCell className="text-red-700">{s.absent}</TableCell>
                  <TableCell>{s.percent}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.rosterStats.length > 10 && (
            <p className="text-xs text-muted-foreground p-2 border-t">
              Showing 10 of {data.rosterStats.length} students
            </p>
          )}
        </div>
      )}
    </div>
  );
}
