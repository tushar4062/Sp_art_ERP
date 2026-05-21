"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BatchCard {
  _id: string;
  batchName: string;
  courseName: string;
  batchDay: string;
  batchTime: string;
  totalStudents: number;
}

export default function TeacherAttendancePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [batches, setBatches] = useState<BatchCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/teacher/attendance/batches", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Unable to load attendance batches");
        }

        const data = await response.json();
        setBatches(data.batches || []);
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Failed to load attendance batches.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, [toast]);

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teacher Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a batch to mark student attendance.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-muted/60 bg-muted/10">
          <AlertCircle className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      ) : batches.length === 0 ? (
        <Card className="rounded-3xl border border-border bg-background px-6 py-8 text-center">
          <CardTitle className="text-lg font-semibold">No batches assigned</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            There are no batches available for your account.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {batches.map((batch) => (
            <button
              key={batch._id}
              onClick={() => router.push(`/teacher/attendance/${batch._id}`)}
              className="group rounded-3xl border border-border bg-gradient-to-r from-primary/5 to-primary/10 p-6 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Batch</p>
                  <h2 className="text-2xl font-semibold tracking-tight">{batch.batchName}</h2>
                </div>
                <div className="rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-muted-foreground">
                  {batch.totalStudents} {batch.totalStudents === 1 ? "Student" : "Students"}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl bg-white/60 p-4">
                  <p className="text-sm font-medium">{batch.courseName}</p>
                  <p className="text-sm text-muted-foreground mt-1">{batch.batchDay}</p>
                  <p className="text-sm text-muted-foreground">{batch.batchTime}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
