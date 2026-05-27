"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Shield, Eye, EyeOff } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { adminSessionAuthHeaders } from "@/lib/auth/admin-session-client";

const credentialsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobileNumber: z.string().min(1, "Mobile number is required"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain uppercase, lowercase, number, and special character"),
  confirmPassword: z.string(),
});

type CredentialForm = z.infer<typeof credentialsSchema>;

type CredentialRow = {
  id: string;
  studentId?: string;
  name: string;
  email: string;
  password?: string;
  mobileNumber?: string;
  role: string;
  accountStatus: string;
  createdAt: string;
};

export default function CredentialsPage() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CredentialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const credentialsForm = useForm<CredentialForm>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      name: "",
      mobileNumber: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/student-credentials', {
        credentials: 'include',
        headers: {
          ...adminSessionAuthHeaders(),
        },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch');
      }
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
    fetchCredentials();
  }, []);

  const onSubmit = async (data: CredentialForm) => {
    try {
      const response = await fetch('/api/student-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          username: data.email.split('@')[0],
          email: data.email,
          password: data.password,
          confirmPassword: data.confirmPassword,
          mobileNumber: data.mobileNumber,
          createdBy: 'Admin',
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || 'Failed to create credential');
        return;
      }

      if (result.emailSent === false) {
        toast.warning('Credential saved but email failed');
      } else {
        toast.success('Credential saved and email sent successfully');
      }

      setRows(prev => [{
        id: result.credentials.id,
        studentId: result.credentials.studentId,
        name: result.credentials.name,
        email: result.credentials.email,
        password: data.password,
        mobileNumber: result.credentials.mobileNumber,
        role: result.credentials.role,
        accountStatus: result.credentials.accountStatus,
        createdAt: result.credentials.createdAt,
      }, ...prev]);
      setOpen(false);
      credentialsForm.reset();
    } catch (error) {
      console.error('Error creating credential:', error);
      toast.error('Failed to create credential');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credentials"
        subtitle="Create and manage student login credentials"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Add Credential
          </Button>
        }
      />

      <div className="card-soft overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No credentials created yet. Use the Add Credential button above.
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'email', header: 'Email' },
              { key: 'password', header: 'Password', render: (row: CredentialRow) => {
                const visible = Boolean(visiblePasswords[row.id]);
                const display = row.password ? (visible ? row.password : '••••••••') : 'Not stored';
                return (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm truncate max-w-[180px]">{display}</span>
                    {row.password && (
                      <button
                        type="button"
                        aria-label={visible ? 'Hide password' : 'Show password'}
                        className="p-1 rounded hover:bg-muted"
                        onClick={() => setVisiblePasswords(prev => ({ ...prev, [row.id]: !prev[row.id] }))}
                      >
                        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                );
              } },
              { key: 'mobile', header: 'Mobile', render: row => row.mobileNumber ?? '-' },
              { key: 'status', header: 'Status', render: row => (
                <span className="inline-flex rounded-full bg-success/15 px-2 py-1 text-[11px] font-medium text-success">{row.accountStatus}</span>
              ) },
              { key: 'role', header: 'Role' },
              { key: 'createdAt', header: 'Created' },
            ]}
            rows={rows.map(row => ({
              id: row.id,
              name: row.name,
              email: row.email,
              password: row.password,
              mobileNumber: row.mobileNumber || '-',
              accountStatus: row.accountStatus,
              role: row.role,
              createdAt: new Date(row.createdAt).toLocaleDateString(),
            }))}
            searchKeys={['name', 'email', 'password', 'mobileNumber']}
          />
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Credential</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 mt-4" onSubmit={credentialsForm.handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...credentialsForm.register('name')} />
              {credentialsForm.formState.errors.name && (
                <p className="text-xs text-red-500">{credentialsForm.formState.errors.name.message}</p>
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
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...credentialsForm.register('email')} />
              {credentialsForm.formState.errors.email && (
                <p className="text-xs text-red-500">{credentialsForm.formState.errors.email.message}</p>
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
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
