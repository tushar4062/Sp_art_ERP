"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, MoreVertical, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import AdminAdmissionForm from "@/components/admin/AdminAdmissionForm";

interface AdmissionItem {
  _id: string;
  fullName: string;
  className?: string;
  email?: string;
  mobile?: string;
  parentName?: string;
  parentMobile?: string;
  address?: string;
  admissionDate?: string;
  notes?: string;
  amountPaid?: number;
  remainingAmount?: number;
  status: "Pending" | "Confirmed" | "Rejected";
  createdAt: string;
  updatedAt: string;
}

type AdmissionFormValues = Omit<AdmissionItem, "_id" | "createdAt" | "updatedAt">;

const CLASSES = ["Beginner - Kids", "Intermediate - Teens", "Advanced", "Professional"];
const STATUS_OPTIONS = ["All", "Pending", "Confirmed", "Rejected"] as const;

const getStatusColor = (status: string) => {
  switch (status) {
    case "Pending":
      return "bg-yellow-100 text-yellow-800";
    case "Confirmed":
      return "bg-green-100 text-green-800";
    case "Rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const defaultForm: AdmissionFormValues = {
  fullName: "",
  className: "",
  email: "",
  mobile: "",
  parentName: "",
  parentMobile: "",
  address: "",
  admissionDate: "",
  notes: "",
  amountPaid: 0,
  remainingAmount: 0,
  status: "Pending",
};

export default function AdminAdmissionPage() {
  const [admissions, setAdmissions] = useState<AdmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [classFilter, setClassFilter] = useState("All");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAdmission, setEditingAdmission] = useState<AdmissionItem | null>(null);
  const [form, setForm] = useState<AdmissionFormValues>(defaultForm);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof AdmissionItem>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  const itemsPerPage = 8;

  const fetchAdmissions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/student-admissions");
      const data = await response.json();
      if (data?.success) {
        setAdmissions(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching admissions:", error);
      toast.error("Failed to load admissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmissions();
  }, [fetchAdmissions]);

  const filteredAdmissions = useMemo(() => {
    let filtered = admissions;

    // Apply status filter
    if (statusFilter !== "All") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    // Apply class filter
    if (classFilter !== "All") {
      filtered = filtered.filter((a) => a.className === classFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.fullName.toLowerCase().includes(query) ||
          a.email?.toLowerCase().includes(query) ||
          a.mobile?.includes(query) ||
          a.parentName?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle undefined values
      if (aVal === undefined || aVal === null) aVal = "";
      if (bVal === undefined || bVal === null) bVal = "";

      // Convert to comparable values
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [admissions, searchQuery, statusFilter, classFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAdmissions.length / itemsPerPage));
  const paginatedAdmissions = filteredAdmissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openAddAdmission = () => {
    setEditingAdmission(null);
    setForm(defaultForm);
    setSheetOpen(true);
  };

  const openEditAdmission = (admission: AdmissionItem) => {
    setEditingAdmission(admission);
    setForm({
      fullName: admission.fullName,
      className: admission.className || "",
      email: admission.email || "",
      mobile: admission.mobile || "",
      parentName: admission.parentName || "",
      parentMobile: admission.parentMobile || "",
      address: admission.address || "",
      admissionDate: admission.admissionDate || "",
      notes: admission.notes || "",
      amountPaid: admission.amountPaid || 0,
      remainingAmount: admission.remainingAmount || 0,
      status: admission.status,
    });
    setSheetOpen(true);
  };

  const handleSaveAdmission = async (data: AdmissionFormValues) => {
    try {
      const url = editingAdmission
        ? `/api/student-admissions/${editingAdmission._id}`
        : "/api/student-admissions";
      const method = editingAdmission ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result?.error || "Failed to save");

      toast.success(editingAdmission ? "Admission updated successfully" : "Admission created successfully");
      setSheetOpen(false);
      setForm(defaultForm);
      setEditingAdmission(null);
      await fetchAdmissions();
    } catch (error) {
      const err = error as Error;
      console.error(error);
      toast.error(err?.message || "Failed to save admission");
    }
  };

  const handleStatusChange = async (admissionId: string, newStatus: "Pending" | "Confirmed" | "Rejected") => {
    try {
      const admission = admissions.find((a) => a._id === admissionId);
      if (!admission) return;

      const response = await fetch(`/api/student-admissions/${admissionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...admission, status: newStatus }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result?.error || "Failed to update status");

      toast.success("Status updated successfully");
      await fetchAdmissions();
    } catch (error) {
      const err = error as Error;
      console.error(error);
      toast.error(err?.message || "Failed to update status");
    }
  };

  const handleDeleteAdmission = async (id: string) => {
    try {
      const response = await fetch(`/api/student-admissions/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result?.error || "Failed to delete");

      toast.success("Admission deleted successfully");
      setDeleteConfirm({ open: false, id: null });
      await fetchAdmissions();
    } catch (error) {
      const err = error as Error;
      console.error(error);
      toast.error(err?.message || "Failed to delete admission");
    }
  };

  const toggleSort = (field: keyof AdmissionItem) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: keyof AdmissionItem }) => {
    if (sortField !== field) return <div className="w-4 h-4" />;
    return sortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admissions"
        subtitle="Manage student admissions and payment details."
        action={
          <Button
            onClick={openAddAdmission}
            className="rounded-xl gradient-primary text-white border-0 shadow-pop"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Admission
          </Button>
        }
      />

      {/* Search & Filter Section */}
      <div className="card-soft p-4 space-y-3 sm:space-y-0 sm:flex sm:items-end sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, email, mobile..."
            className="pl-9 h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={classFilter} onValueChange={(val) => { setClassFilter(val); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-40 h-9">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Classes</SelectItem>
            {CLASSES.map((cls) => (
              <SelectItem key={cls} value={cls}>
                {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table Section */}
      <div className="card-soft">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading admissions...</div>
        ) : paginatedAdmissions.length === 0 && admissions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-2">📋</div>
            <h3 className="font-semibold text-lg">No admissions found</h3>
            <p className="text-sm text-muted-foreground">New admissions will appear here.</p>
            <Button
              onClick={openAddAdmission}
              className="mt-4 rounded-xl gradient-primary text-white border-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Admission
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead
                      className="px-4 py-3 text-left cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => toggleSort("fullName")}
                    >
                      <div className="flex items-center gap-2">
                        <span>Student</span>
                        <SortIcon field="fullName" />
                      </div>
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left">Course / Class</TableHead>
                    <TableHead className="px-4 py-3 text-left">Mobile</TableHead>
                    <TableHead className="px-4 py-3 text-left">Parent</TableHead>
                    <TableHead
                      className="px-4 py-3 text-left cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => toggleSort("amountPaid")}
                    >
                      <div className="flex items-center gap-2">
                        <span>Amount Paid</span>
                        <SortIcon field="amountPaid" />
                      </div>
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left">Remaining</TableHead>
                    <TableHead className="px-4 py-3 text-left">Date</TableHead>
                    <TableHead className="px-4 py-3 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/70">
                  {paginatedAdmissions.map((admission) => (
                    <TableRow key={admission._id} className="border-0 hover:bg-muted/60 transition-colors">
                      <TableCell className="px-4 py-3">
                        <div className="font-semibold">{admission.fullName}</div>
                        <div className="text-xs text-muted-foreground">{admission.email || "No email"}</div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">{admission.className || "-"}</TableCell>
                      <TableCell className="px-4 py-3 text-sm">{admission.mobile || "-"}</TableCell>
                      <TableCell className="px-4 py-3 text-sm">{admission.parentName || "-"}</TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                        ₹{Number(admission.amountPaid ?? 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                        ₹{Number(admission.remainingAmount ?? 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                        {admission.admissionDate
                          ? new Date(admission.admissionDate).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              year: "2-digit",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditAdmission(admission)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {admission.status !== "Confirmed" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(admission._id, "Confirmed")}>
                                  Mark as Confirmed
                                </DropdownMenuItem>
                              )}
                              {admission.status !== "Pending" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(admission._id, "Pending")}>
                                  Mark as Pending
                                </DropdownMenuItem>
                              )}
                              {admission.status !== "Rejected" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(admission._id, "Rejected")}>
                                  Mark as Rejected
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteConfirm({ open: true, id: admission._id })}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 flex items-center justify-between border-t border-border/50">
                <div className="text-sm text-muted-foreground">
                  {paginatedAdmissions.length > 0
                    ? `Page ${currentPage} of ${totalPages} (${filteredAdmissions.length} results)`
                    : "No results"}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Admission Form Drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[820px] h-screen">
          <div className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>{editingAdmission ? "Edit Admission" : "New Admission"}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="pr-4 pb-28">
                <AdminAdmissionForm
                  formId="admission-form"
                  initialData={form}
                  onClose={() => setSheetOpen(false)}
                  onSuccess={handleSaveAdmission}
                />
              </div>
            </div>

            <SheetFooter className="border-t border-border p-3">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => (document.getElementById("admission-form") as HTMLFormElement | null)?.requestSubmit()}
                className="rounded-xl gradient-primary text-white border-0 shadow-pop"
              >
                {editingAdmission ? "Update Admission" : "Submit Admission"}
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this admission record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteConfirm.id && handleDeleteAdmission(deleteConfirm.id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
