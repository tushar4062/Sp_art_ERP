"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { SheetFooter } from "@/components/ui/sheet";
import { toast } from "sonner";

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
  status: string;
  createdAt: string;
  updatedAt: string;
}

const admissionSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  className: z.string().optional(),
  email: z.string().email().optional(),
  mobile: z.string().min(7).optional(),
  parentName: z.string().optional(),
  parentMobile: z.string().optional(),
  address: z.string().optional(),
  admissionDate: z.string().optional(),
  notes: z.string().optional(),
  amountPaid: z.preprocess((value) => value === '' ? 0 : Number(value), z.number().min(0)).optional(),
  remainingAmount: z.preprocess((value) => value === '' ? 0 : Number(value), z.number().min(0)).optional(),
  status: z.enum(["Pending", "Confirmed", "Rejected"]).optional(),
});

type AdmissionFormValues = z.infer<typeof admissionSchema>;

export default function AdmissionForm({ onClose, onSuccess, formId = 'admission-form' }: { onClose: () => void; onSuccess?: (item: AdmissionItem) => void; formId?: string }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionSchema),
    defaultValues: { className: "", amountPaid: 0, remainingAmount: 0 }
  });

  async function onSubmit(values: AdmissionFormValues) {
    try {
      const res = await fetch('/api/student-admissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error || 'Failed to save');
      toast.success('Admission saved');
      reset();
      onSuccess?.(data.item);
      onClose();
    } catch (e) {
      const err = e as Error;
      console.error(e);
      toast.error(err?.message || 'Unable to save admission');
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
      <div className="col-span-1">
        <Label>Student Full Name</Label>
        <Input className="h-9 text-sm" {...register('fullName')} placeholder="e.g. Aarav Sharma" />
        {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>}
      </div>

      <div className="col-span-1">
        <Label>Course / Class</Label>
        <Select onValueChange={(val) => setValue('className', val)}>
          <SelectTrigger className="h-9 text-sm" aria-label="Class">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Beginner - Kids">Beginner - Kids</SelectItem>
            <SelectItem value="Intermediate - Teens">Intermediate - Teens</SelectItem>
            <SelectItem value="Advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      

      <div>
        <Label>Email Address</Label>
        <Input className="h-9 text-sm" {...register('email')} placeholder="parent@example.com" />
      </div>

      <div>
        <Label>Mobile Number</Label>
        <Input className="h-9 text-sm" {...register('mobile')} placeholder="Mobile" />
      </div>

      <div>
        <Label>Parent Name</Label>
        <Input className="h-9 text-sm" {...register('parentName')} placeholder="Parent / Guardian" />
      </div>

      <div>
        <Label>Parent Mobile</Label>
        <Input className="h-9 text-sm" {...register('parentMobile')} placeholder="Parent mobile" />
      </div>

      <div className="col-span-1 sm:col-span-2">
        <Label>Address</Label>
        <Textarea className="text-sm" {...register('address')} placeholder="Address" />
      </div>

      <div className="col-span-1 sm:col-span-2">
        <Label>Admission Date</Label>
        <Input className="h-9 text-sm" type="date" {...register('admissionDate')} />
      </div>

      <div className="col-span-1">
        <Label>Amount Paid (₹)</Label>
        <Input className="h-9 text-sm" type="number" {...register('amountPaid')} placeholder="0" />
        <p className="text-xs text-muted-foreground mt-1">₹{Number(watch('amountPaid') ?? 0).toLocaleString('en-IN')}</p>
      </div>

      <div className="col-span-1">
        <Label>Remaining Amount (₹)</Label>
        <Input className="h-9 text-sm" type="number" {...register('remainingAmount')} placeholder="0" />
        <p className="text-xs text-muted-foreground mt-1">₹{Number(watch('remainingAmount') ?? 0).toLocaleString('en-IN')}</p>
      </div>

      <div className="col-span-1 sm:col-span-2">
        <Label>Notes / Remarks</Label>
        <Textarea className="text-sm" {...register('notes')} placeholder="Any remarks" />
      </div>
    </form>
  );
}
