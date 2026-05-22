"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";
import { leaveStatusPillClass } from "@/lib/leave/leaveStatusStyles";
import { PAST_DATE_MESSAGE, todayDateString, validateLeaveDateRange } from "@/lib/leave/dateValidation";
import { DUPLICATE_LEAVE_TOAST } from "@/lib/leave/duplicateLeave";
import { submitLeaveRequest } from "@/lib/leave/submitLeaveRequest";

const SUBMIT_DEBOUNCE_MS = 1500;

type LeaveRow = {
  id: string;
  type: string;
  from: string;
  to: string;
  reason: string;
  status: string;
  adminRemark?: string;
};

type Balance = { casual: number; sick: number; personal: number };

const BALANCE_UI = [
  { k: "Casual", key: "casual" as const, c: "text-info" },
  { k: "Sick", key: "sick" as const, c: "text-success" },
  { k: "Personal", key: "personal" as const, c: "text-secondary" },
];

export type LeaveApplyPageConfig = {
  apiPath: string;
  loginRoleLabel: string;
  title?: string;
  subtitle?: string;
};

export function LeaveApplyPage({
  apiPath,
  loginRoleLabel,
  title = "My Leaves",
  subtitle = "Apply and track",
}: LeaveApplyPageConfig) {
  const router = useRouter();
  const [form, setForm] = useState({ type: "Casual", from: "", to: "", reason: "" });
  const [leaveRequests, setLeaveRequests] = useState<LeaveRow[]>([]);
  const [balance, setBalance] = useState<Balance>({ casual: 6, sick: 8, personal: 3 });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const lastSubmitAtRef = useRef(0);
  const formRef = useRef(form);
  formRef.current = form;

  const minLeaveDate = todayDateString();
  const toMinDate =
    form.from && form.from >= minLeaveDate ? form.from : minLeaveDate;

  const reloadLeaves = useCallback(async () => {
    try {
      const res = await fetch(apiPath, { credentials: "include" });
      if (res.status === 401) {
        toast.error(`Please sign in again as ${loginRoleLabel}.`);
        router.push("/login");
        return;
      }
      const json = await parseJsonResponse<{
        error?: string;
        data?: { leaves: LeaveRow[]; balance: Balance };
      }>(res);
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setLeaveRequests(json.data?.leaves ?? []);
      if (json.data?.balance) setBalance(json.data.balance);
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to load leave data"));
    }
  }, [apiPath, loginRoleLabel, router]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(apiPath, {
          credentials: "include",
          signal: controller.signal,
        });
        if (cancelled) return;
        if (res.status === 401) {
          toast.error(`Please sign in again as ${loginRoleLabel}.`);
          router.push("/login");
          return;
        }
        const json = await parseJsonResponse<{
          error?: string;
          data?: { leaves: LeaveRow[]; balance: Balance };
        }>(res);
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setLeaveRequests(json.data?.leaves ?? []);
        if (json.data?.balance) setBalance(json.data.balance);
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
        toast.error(messageFromUnknown(e, "Failed to load leave data"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiPath, loginRoleLabel, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (submitLockRef.current) return;

    const now = Date.now();
    if (now - lastSubmitAtRef.current < SUBMIT_DEBOUNCE_MS) return;

    const payload = {
      leaveType: formRef.current.type,
      fromDate: formRef.current.from,
      toDate: formRef.current.to,
      reason: formRef.current.reason,
    };

    if (!payload.fromDate || !payload.toDate) {
      toast.error("Pick dates");
      return;
    }

    const dateCheck = validateLeaveDateRange(payload.fromDate, payload.toDate);
    if (dateCheck.ok === false) {
      toast.error(dateCheck.error);
      return;
    }

    submitLockRef.current = true;
    lastSubmitAtRef.current = now;
    setIsSubmitting(true);

    try {
      const result = await submitLeaveRequest(apiPath, payload);

      if (result.ok === false) {
        if (result.kind === "auth") {
          toast.error(`Please sign in again as ${loginRoleLabel}.`);
          router.push("/login");
          return;
        }
        if (result.kind === "duplicate") {
          toast.error(DUPLICATE_LEAVE_TOAST);
          return;
        }
        if (result.kind === "validation") {
          toast.error(result.message);
          return;
        }
        toast.error("Something went wrong");
        return;
      }

      toast.success("Leave request submitted successfully");
      setForm({ type: "Casual", from: "", to: "", reason: "" });
      await reloadLeaves();
    } catch {
      toast.error("Something went wrong");
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="space-y-3">
          <div className="card-soft p-5">
            <div className="text-sm font-semibold text-muted-foreground mb-2">Leave balance</div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {BALANCE_UI.map(b => (
                  <div
                    key={b.k}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/40"
                  >
                    <span className="font-semibold text-sm">{b.k}</span>
                    <span className={`font-display font-bold text-xl ${b.c}`}>{balance[b.key]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 card-soft p-5">
          <h3 className="font-display font-bold mb-3">Apply for leave</h3>
          <form
            className="space-y-3"
            onSubmit={handleSubmit}
            aria-busy={isSubmitting}
            noValidate
          >
            <fieldset disabled={isSubmitting} className="space-y-3 border-0 p-0 m-0 min-w-0">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={v => setForm(f => ({ ...f, type: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Casual">Casual</SelectItem>
                    <SelectItem value="Sick">Sick</SelectItem>
                    <SelectItem value="Personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>From</Label>
                  <Input
                    type="date"
                    className="rounded-xl"
                    min={minLeaveDate}
                    value={form.from}
                    onChange={e => {
                      const from = e.target.value;
                      if (from && from < minLeaveDate) {
                        toast.error(PAST_DATE_MESSAGE);
                        return;
                      }
                      setForm(f => {
                        let to = f.to;
                        if (to && (to < from || to < minLeaveDate)) {
                          to = from >= minLeaveDate ? from : "";
                        }
                        return { ...f, from, to };
                      });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>To</Label>
                  <Input
                    type="date"
                    className="rounded-xl"
                    min={toMinDate}
                    value={form.to}
                    onChange={e => {
                      const to = e.target.value;
                      if (to && to < minLeaveDate) {
                        toast.error(PAST_DATE_MESSAGE);
                        return;
                      }
                      setForm(f => ({ ...f, to }));
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Textarea
                  rows={3}
                  className="rounded-xl"
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="w-full rounded-xl gradient-primary text-white border-0"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </fieldset>
          </form>
        </div>
      </div>

      <div>
        <h3 className="font-display font-bold text-lg mb-3">Leave history</h3>
        <div className="card-soft overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : leaveRequests.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">No leave requests yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">From</th>
                  <th className="px-3 py-2 text-left">To</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map(l => (
                  <tr key={l.id} className="border-t border-border/60">
                    <td className="px-3 py-2">{l.type}</td>
                    <td className="px-3 py-2">{l.from}</td>
                    <td className="px-3 py-2">{l.to}</td>
                    <td className="px-3 py-2">
                      <StatusPill status={l.status} className={leaveStatusPillClass(l.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
