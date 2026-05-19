"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const credentialsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobileNumber: z.string().min(1, "Mobile number is required"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain uppercase, lowercase, number, and special character"),
  confirmPassword: z.string(),
  accountStatus: z.enum(["Active", "Inactive"]).default("Active"),
});

type CredentialForm = z.infer<typeof credentialsSchema>;

type CredentialRole = "student" | "teacher" | "senior_teacher";

type CredentialRow = {
  id: string;
  name: string;
  email: string;
  password?: string;
  mobileNumber?: string;
  role: CredentialRole;
  accountStatus: "Active" | "Inactive";
  createdAt: string;
};

const roleLabels: Record<CredentialRole, string> = {
  student: "Students",
  teacher: "Teachers",
  senior_teacher: "Senior Teachers",
};

const buttonLabels: Record<CredentialRole, string> = {
  student: "Add Student Credential",
  teacher: "Add Teacher Credential",
  senior_teacher: "Add Senior Teacher Credential",
};

const roleDisplay: Record<CredentialRole, string> = {
  student: "Student",
  teacher: "Teacher",
  senior_teacher: "Senior Teacher",
};

export default function AdminCredentialsPage() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CredentialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<CredentialRole>("student");
  const [editing, setEditing] = useState<CredentialRow | null>(null);

  const credentialsForm = useForm<CredentialForm>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      name: "",
      mobileNumber: "",
      email: "",
      password: "",
      confirmPassword: "",
      accountStatus: "Active",
    },
  });

  const fetchCredentials = async (role: CredentialRole) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/credentials?role=${role}`);
      const result = await response.json();
      setRows(result.credentials ?? []);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      toast.error('Unable to load credentials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials(activeRole);
  }, [activeRole]);

  const clearForm = () => {
    credentialsForm.reset({
      name: "",
      mobileNumber: "",
      email: "",
      password: "",
      confirmPassword: "",
      accountStatus: "Active",
    });
    setEditing(null);
  };

  const openAddModal = () => {
    clearForm();
    setOpen(true);
  };

  const openEditModal = (row: CredentialRow) => {
    setEditing(row);
    credentialsForm.reset({
      name: row.name,
      mobileNumber: row.mobileNumber ?? "",
      email: row.email,
      password: "",
      confirmPassword: "",
      accountStatus: row.accountStatus,
    });
    setOpen(true);
  };

  const onSubmit = async (data: CredentialForm) => {
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        mobileNumber: data.mobileNumber,
        accountStatus: data.accountStatus,
        role: activeRole,
        createdBy: 'Admin',
      };

      if (!editing || data.password) {
        payload.password = data.password;
        payload.confirmPassword = data.confirmPassword;
      }

      const url = editing ? `/api/credentials/${editing.id}` : '/api/credentials';
      const method = editing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || 'Failed to save credential');
        return;
      }

      const newRow: CredentialRow = {
        id: result.credentials.id,
        name: result.credentials.name,
        email: result.credentials.email,
        password: result.credentials.password,
        mobileNumber: result.credentials.mobileNumber,
        role: result.credentials.role,
        accountStatus: result.credentials.accountStatus,
        createdAt: new Date(result.credentials.createdAt).toISOString(),
      };

      if (editing) {
        setRows(prev => prev.map(row => row.id === editing.id ? newRow : row));
        toast.success('Credential updated successfully');
      } else {
        setRows(prev => [newRow, ...prev]);
        toast.success('Credential added successfully');
      }

      setOpen(false);
      clearForm();
    } catch (error) {
      console.error('Error saving credential:', error);
      toast.error('Failed to save credential');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this credential? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/credentials/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || 'Failed to delete credential');
        return;
      }

      setRows(prev => prev.filter(row => row.id !== id));
      toast.success(result.message || 'Credential deleted');
    } catch (error) {
      console.error('Error deleting credential:', error);
      toast.error('Failed to delete credential');
    }
  };

  const modalTitle = editing ? `Edit ${roleDisplay[activeRole]} Credential` : `Add ${roleDisplay[activeRole]} Credential`;
  const actionButtonLabel = buttonLabels[activeRole];
  const emptyStateTitle = `No ${roleLabels[activeRole].toLowerCase()} credentials yet.`;

  const tableRows = useMemo(() => rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    mobileNumber: row.mobileNumber || '-',
    role: roleDisplay[row.role],
    accountStatus: row.accountStatus,
    createdAt: new Date(row.createdAt).toLocaleDateString(),
  })), [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credentials"
        subtitle="Create and manage login credentials for students, teachers, and senior teachers"
        action={
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4" /> {actionButtonLabel}
          </Button>
        }
      />

      <div className="card-soft p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {Object.entries(roleLabels).map(([role, label]) => (
            <Button
              key={role}
              variant={activeRole === role ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setActiveRole(role as CredentialRole)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="card-soft overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading credentials…</div>
        ) : tableRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{emptyStateTitle} Use the button above to add one.</div>
        ) : (
          <DataTable
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'email', header: 'Email' },
              { key: 'password', header: 'Password', render: row => row.password ?? 'Not stored' },
              { key: 'mobileNumber', header: 'Mobile' },
              { key: 'role', header: 'Role' },
              { key: 'accountStatus', header: 'Status', render: row => (
                <span className="inline-flex rounded-full bg-success/15 px-2 py-1 text-[11px] font-medium text-success">
                  {row.accountStatus}
                </span>
              ) },
              { key: 'createdAt', header: 'Created' },
              { key: 'actions', header: 'Actions', render: row => (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditModal(row as CredentialRow)}>
                    <Pencil className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(row.id)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>
              ) },
            ]}
            rows={tableRows}
            searchKeys={['name', 'email', 'password', 'mobileNumber', 'role']}
          />
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 mt-4" onSubmit={credentialsForm.handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...credentialsForm.register('name')} />
              {credentialsForm.formState.errors.name && (
                <p className="text-xs text-red-500">{credentialsForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...credentialsForm.register('email')} />
              {credentialsForm.formState.errors.email && (
                <p className="text-xs text-red-500">{credentialsForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input id="mobileNumber" {...credentialsForm.register('mobileNumber')} />
              {credentialsForm.formState.errors.mobileNumber && (
                <p className="text-xs text-red-500">{credentialsForm.formState.errors.mobileNumber.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...credentialsForm.register('password')} />
              {credentialsForm.formState.errors.password && (
                <p className="text-xs text-red-500">{credentialsForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" {...credentialsForm.register('confirmPassword')} />
              {credentialsForm.formState.errors.confirmPassword && (
                <p className="text-xs text-red-500">{credentialsForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accountStatus">Status</Label>
              <Select value={credentialsForm.watch('accountStatus')} onValueChange={value => credentialsForm.setValue('accountStatus', value as "Active" | "Inactive") }>
                <SelectTrigger id="accountStatus"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); clearForm(); }}>
                Cancel
              </Button>
              <Button type="submit">Save Credential</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
