"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award, Calendar, ChevronLeft, ChevronRight, GraduationCap, Mail, Search, User } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { QueryStatusBadge } from "@/components/student/QueryStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";
import type { UnifiedAdminQuery } from "@/lib/admin/unifiedQueries";
import { batchFetch } from "@/lib/batch/batchFetch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function roleLabel(roleType: UnifiedAdminQuery["roleType"]) {
  if (roleType === "student") return "Student";
  if (roleType === "teacher") return "Teacher";
  return "Senior teacher";
}

function RoleBadge({ roleType }: { roleType: UnifiedAdminQuery["roleType"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        roleType === "student" && "bg-blue-50 text-blue-800 border-blue-200",
        roleType === "teacher" && "bg-violet-50 text-violet-800 border-violet-200",
        roleType === "senior_teacher" && "bg-amber-50 text-amber-900 border-amber-200",
      )}
    >
      {roleLabel(roleType)}
    </span>
  );
}

export default function AdminQueriesPage() {
  const [rows, setRows] = useState<UnifiedAdminQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<UnifiedAdminQuery | null>(null);
  const [adminRemark, setAdminRemark] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (roleFilter !== "all") params.set("roleType", roleFilter);
      params.set("page", String(page));
      params.set("limit", "12");

      const res = await batchFetch(`/api/admin/queries?${params}`);
      const json = await parseJsonResponse<{
        error?: string;
        data?: {
          queries: UnifiedAdminQuery[];
          total: number;
          pagination: { totalPages: number };
        };
      }>(res);
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setRows(json.data?.queries ?? []);
      setTotal(json.data?.total ?? 0);
      setTotalPages(json.data?.pagination?.totalPages ?? 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load queries");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, roleFilter]);

  const openDetail = (r: UnifiedAdminQuery) => {
    setDetail(r);
    setAdminRemark(r.adminRemark || "");
  };

  const patchQuery = async (
    q: UnifiedAdminQuery,
    action: "approve" | "reject" | "update_remark",
  ) => {
    setActing(true);
    try {
      const res = await batchFetch(`/api/admin/queries/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminRemark, roleType: q.roleType }),
      });
      const json = await parseJsonResponse<{
        error?: string;
        message?: string;
        query?: UnifiedAdminQuery;
      }>(res);
      if (!res.ok) throw new Error(json.error || "Update failed");
      toast.success(json.message || "Query updated");
      if (action === "update_remark" && json.query) {
        setDetail(json.query);
        setAdminRemark(json.query.adminRemark || "");
      } else {
        setDetail(null);
        setAdminRemark("");
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Queries"
        subtitle="Profile edit requests from students, teachers, and senior teachers"
      />

      <div className="card-soft p-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 rounded-xl"
            placeholder="Search name, email, query…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-40 rounded-xl">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="senior_teacher">Senior teacher</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!loading && total > 0 && (
        <p className="text-sm text-muted-foreground">
          {total} quer{total === 1 ? "y" : "ies"} · page {page} of {totalPages}
        </p>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card-soft flex flex-col items-center justify-center py-16 text-center">
          <p className="font-display text-lg font-semibold">No queries found</p>
          <p className="text-sm text-muted-foreground mt-1">Try changing search or filters</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r, index) => (
            <motion.article
              key={`${r.roleType}-${r.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.2) }}
              className="card-soft flex flex-col p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex flex-wrap gap-1.5">
                  <QueryStatusBadge status={r.status} />
                  <RoleBadge roleType={r.roleType} />
                </div>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                  <Calendar className="h-3 w-3" />
                  {new Date(r.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>

              <h3 className="font-display font-semibold text-base leading-tight">{r.personName}</h3>

              <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-2 truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{r.personEmail}</span>
                </p>
                <p className="flex items-center gap-2">
                  {r.roleType === "student" ? (
                    <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : r.roleType === "teacher" ? (
                    <GraduationCap className="h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : (
                    <Award className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                  {roleLabel(r.roleType)} query
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-border/60">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl flex-1 min-w-[80px]"
                  onClick={() => openDetail(r)}
                >
                  View Details
                </Button>
                {r.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      className="rounded-xl flex-1 min-w-[80px] bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={acting}
                      onClick={() => {
                        setAdminRemark(r.adminRemark || "");
                        void patchQuery(r, "approve");
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-xl flex-1 min-w-[80px]"
                      disabled={acting}
                      onClick={() => {
                        setAdminRemark(r.adminRemark || "");
                        void patchQuery(r, "reject");
                      }}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={page <= 1 || loading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={open => !open && setDetail(null)}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Query details</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <QueryStatusBadge status={detail.status} />
                <RoleBadge roleType={detail.roleType} />
                <span className="text-muted-foreground">
                  {new Date(detail.createdAt).toLocaleString("en-IN")}
                </span>
              </div>
              <p>
                <span className="text-muted-foreground">{roleLabel(detail.roleType)}:</span>{" "}
                {detail.personName}
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span> {detail.personEmail}
              </p>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-muted-foreground text-xs uppercase mb-1">Query</p>
                <p className="whitespace-pre-wrap">{detail.remarks}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-remark">Admin remark</Label>
                <Textarea
                  id="admin-remark"
                  rows={3}
                  className="rounded-xl"
                  value={adminRemark}
                  onChange={e => setAdminRemark(e.target.value)}
                  placeholder={`Optional note to ${roleLabel(detail.roleType).toLowerCase()}…`}
                />
              </div>
              {detail.status === "pending" ? (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={acting}
                    onClick={() => void patchQuery(detail, "approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 rounded-xl"
                    disabled={acting}
                    onClick={() => void patchQuery(detail, "reject")}
                  >
                    Reject
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full rounded-xl"
                  disabled={acting}
                  onClick={() => void patchQuery(detail, "update_remark")}
                >
                  Save remark
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
