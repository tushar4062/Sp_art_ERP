"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { batchFetch } from "@/lib/batch/batchFetch";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";

type RecordRow = {
  attendanceDate: string;
  teacherName: string;
  status: string;
  remarks: string;
};

export function BatchTeacherAttendancePanel({ batchId }: { batchId: string }) {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, percent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await batchFetch(`/api/attendance/batches/${batchId}/teacher-attendance`);
        const json = await parseJsonResponse<{
          data?: { records: RecordRow[]; summary: typeof summary };
        }>(res);
        if (res.ok && json.data) {
          setRecords(json.data.records);
          setSummary(json.data.summary);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [batchId]);

  if (loading) return <Skeleton className="h-32 rounded-2xl" />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Teacher self-attendance:{" "}
        <span className="text-emerald-700 font-medium">{summary.present} present</span>
        {" · "}
        <span className="text-red-700 font-medium">{summary.absent} absent</span>
        {" · "}
        <span className="font-medium">{summary.percent}%</span>
      </p>
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">No teacher attendance logged yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-48 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.slice(0, 15).map(r => (
                <TableRow key={`${r.attendanceDate}-${r.teacherName}`}>
                  <TableCell>{r.attendanceDate}</TableCell>
                  <TableCell>{r.teacherName}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        r.status === "Present"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
