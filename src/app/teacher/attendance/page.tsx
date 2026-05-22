"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight } from "lucide-react";
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
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `HTTP ${response.status}: Unable to load attendance batches`;
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setBatches(data.batches || []);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load attendance batches.";
        console.error("Fetch batches error:", errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
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
            <Card
              key={batch._id}
              className="rounded-3xl border border-border bg-gradient-to-r from-primary/5 to-primary/10 shadow-sm"
            >
              <CardHeader className="pb-0">
                <div className="flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Batch</p>
                  <h2 className="text-2xl font-semibold tracking-tight">{batch.batchName}</h2>
                </div>
                <div className="rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-muted-foreground">
                  {batch.totalStudents} {batch.totalStudents === 1 ? "Student" : "Students"}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl bg-white/70 p-4">
                  <p className="text-sm font-semibold">Course</p>
                  <p className="text-base font-medium">{batch.courseName}</p>
                </div>
                <div className="rounded-3xl bg-white/70 p-4">
                  <p className="text-sm font-semibold">Schedule</p>
                  <p className="text-sm text-muted-foreground">{batch.batchDay}</p>
                  <p className="text-sm text-muted-foreground">{batch.batchTime}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  onClick={() => router.push(`/teacher/attendance/${batch._id}`)}
                >
                  Attendance Report
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
