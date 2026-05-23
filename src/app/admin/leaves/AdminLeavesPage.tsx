"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Eye, X } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar } from "@/components/shared/Avatar";
import { StatusPill } from "@/components/shared/StatusPill";
import { StaffTypeBadge, type LeaveStaffType } from "@/components/leave/StaffTypeBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { batchFetch } from "@/lib/batch/batchFetch";
import { clearAdminSessionToken } from "@/lib/auth/admin-session-client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";
import { leaveStatusPillClass } from "@/lib/leave/leaveStatusStyles";

type LeaveRow = {
  id: string;
  staffType: LeaveStaffType;
  staffName: string;
  leaveType: string;
  from: string;
  to: string;
  reason: string;
  status: string;
  adminRemark: string;
  daysCount: number;
  createdAt?: string;
};

function patchPath(row: LeaveRow) {
  return row.staffType === "senior_teacher"
    ? `/api/admin/leaves/senior-teacher/${row.id}`
    : `/api/admin/leaves/${row.id}`;
}

export function AdminLeavesPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterStaff, setFilterStaff] = useState<"All" | LeaveStaffType>("All");
  const [detail, setDetail] = useState<LeaveRow | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    leave: LeaveRow;
    action: "approve" | "reject";
  } | null>(null);
  const [remark, setRemark] = useState("");
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus !== "All" ? `?status=${filterStatus}` : "";
      const [teacherRes, seniorRes] = await Promise.all([
        batchFetch(`/api/admin/leaves${params}`),
        batchFetch(`/api/admin/leaves/senior-teacher${params}`),
      ]);

      if (teacherRes.status === 401 || seniorRes.status === 401) {
        clearAdminSessionToken();
        logout();
        toast.error("Admin session expired. Please sign in again.");
        router.replace("/login");
        return;
      }

      const teacherJson = await parseJsonResponse<{
        error?: string;
        data?: {
          leaves: Array<{
            id: string;
            teacherName: string;
            leaveType: string;
            from: string;
            to: string;
            reason: string;
            status: string;
            adminRemark: string;
            daysCount: number;
            createdAt?: string;
          }>;
        };
      }>(teacherRes);

      const seniorJson = await parseJsonResponse<{
        error?: string;
        data?: {
          leaves: Array<{
            id: string;
            seniorTeacherName: string;
            leaveType: string;
            from: string;
            to: string;
            reason: string;
            status: string;
            adminRemark: string;
            daysCount: number;
            createdAt?: string;
          }>;
        };
      }>(seniorRes);

      if (!teacherRes.ok) throw new Error(teacherJson.error || "Failed to load teacher leaves");
      if (!seniorRes.ok) throw new Error(seniorJson.error || "Failed to load senior teacher leaves");

      const teacherRows: LeaveRow[] = (teacherJson.data?.leaves ?? []).map(l => ({
        id: l.id,
        staffType: "teacher" as const,
        staffName: l.teacherName,
        leaveType: l.leaveType,
        from: l.from,
        to: l.to,
        reason: l.reason,
        status: l.status,
        adminRemark: l.adminRemark,
        daysCount: l.daysCount,
        createdAt: l.createdAt,
      }));

      const seniorRows: LeaveRow[] = (seniorJson.data?.leaves ?? []).map(l => ({
        id: l.id,
        staffType: "senior_teacher" as const,
        staffName: l.seniorTeacherName,
        leaveType: l.leaveType,
        from: l.from,
        to: l.to,
        reason: l.reason,
        status: l.status,
        adminRemark: l.adminRemark,
        daysCount: l.daysCount,
        createdAt: l.createdAt,
      }));

      const merged = [...teacherRows, ...seniorRows].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setRows(merged);
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to load leave requests"));
    } finally {
      setLoading(false);
    }
  }, [filterStatus, logout, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(() => {
    if (filterStaff === "All") return rows;
    return rows.filter(r => r.staffType === filterStaff);
  }, [rows, filterStaff]);

  const runAction = async () => {
    if (!confirmAction) return;
    setProcessing(true);
    try {
      const res = await batchFetch(patchPath(confirmAction.leave), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: confirmAction.action,
          adminRemark: remark,
        }),
      });
      const json = await parseJsonResponse<{ error?: string; message?: string }>(res);
      if (!res.ok) throw new Error(json.error || "Update failed");
      toast.success(json.message || `Leave ${confirmAction.action === "approve" ? "approved" : "rejected"}`);
      setConfirmAction(null);
      setRemark("");
      setDetail(null);
      void load();
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to update leave"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave management"
        subtitle="Review and approve leave requests from teachers and senior teachers"
      />

      <div className="card-soft p-4 flex flex-wrap gap-3 items-end">
        <div className="w-48">
          <Label className="text-xs text-muted-foreground">Staff type</Label>
          <Select
            value={filterStaff}
            onValueChange={v => setFilterStaff(v as "All" | LeaveStaffType)}
          >
            <SelectTrigger className="rounded-xl mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All staff</SelectItem>
              <SelectItem value="teacher">Teachers only</SelectItem>
              <SelectItem value="senior_teacher">Senior teachers only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="rounded-xl mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="card-soft p-10 text-center text-sm text-muted-foreground">
          No leave requests found.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleRows.map(l => (
            <div key={`${l.staffType}-${l.id}`} className="card-soft p-4 flex flex-col gap-3 h-full">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={l.staffName} size={40} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <StaffTypeBadge staffType={l.staffType} />
                    </div>
                    <div className="font-bold truncate">{l.staffName}</div>
                    <div className="text-xs text-muted-foreground">{l.leaveType} leave</div>
                  </div>
                </div>
                <StatusPill status={l.status} className={leaveStatusPillClass(l.status)} />
              </div>

              <div className="text-sm space-y-1.5 flex-1">
                <div>
                  <span className="text-muted-foreground">Dates: </span>
                  <span className="font-semibold">
                    {l.from} → {l.to}
                  </span>
                  <span className="text-muted-foreground text-xs ml-1">
                    ({l.daysCount} day{l.daysCount === 1 ? "" : "s"})
                  </span>
                </div>
                <div className="line-clamp-3">
                  <span className="text-muted-foreground">Reason: </span>
                  {l.reason}
                </div>
                {l.adminRemark ? (
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    <span className="font-medium">Remarks: </span>
                    {l.adminRemark}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg flex-1 min-w-[80px]"
                  onClick={() => setDetail(l)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  View
                </Button>
                {l.status === "Pending" && (
                  <>
                    <Button
                      size="sm"
                      className="rounded-lg flex-1 min-w-[80px] bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        setRemark("");
                        setConfirmAction({ leave: l, action: "approve" });
                      }}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg flex-1 min-w-[80px] text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        setRemark("");
                        setConfirmAction({ leave: l, action: "reject" });
                      }}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Leave details</DialogTitle>
          </DialogHeader>
          {detail && (
            <dl className="text-sm space-y-2">
              <div className="flex justify-between gap-2 items-center">
                <dt className="text-muted-foreground">Staff</dt>
                <dd className="flex flex-col items-end gap-1">
                  <StaffTypeBadge staffType={detail.staffType} />
                  <span className="font-medium">{detail.staffName}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Type</dt>
                <dd>{detail.leaveType}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Dates</dt>
                <dd>
                  {detail.from} → {detail.to} ({detail.daysCount} day
                  {detail.daysCount === 1 ? "" : "s"})
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Reason</dt>
                <dd className="mt-1">{detail.reason}</dd>
              </div>
              <div className="flex justify-between gap-2 items-center">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <StatusPill status={detail.status} className={leaveStatusPillClass(detail.status)} />
                </dd>
              </div>
              {detail.adminRemark ? (
                <div>
                  <dt className="text-muted-foreground">Admin remarks</dt>
                  <dd className="mt-1">{detail.adminRemark}</dd>
                </div>
              ) : null}
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={o => !o && setConfirmAction(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "approve" ? "Approve leave?" : "Reject leave?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {confirmAction ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <StaffTypeBadge staffType={confirmAction.leave.staffType} />
                      <span className="font-medium text-foreground">
                        {confirmAction.leave.staffName}
                      </span>
                    </div>
                    <p>
                      {confirmAction.leave.leaveType} — {confirmAction.leave.from} to{" "}
                      {confirmAction.leave.to}.
                    </p>
                  </>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label>Remarks (optional)</Label>
            <Textarea
              className="rounded-xl mt-1"
              rows={2}
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="Note for the staff member…"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmAction?.action === "approve"
                  ? "rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  : "rounded-xl bg-red-600 hover:bg-red-700"
              }
              disabled={processing}
              onClick={e => {
                e.preventDefault();
                void runAction();
              }}
            >
              {processing ? "Saving…" : confirmAction?.action === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
