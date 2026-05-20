"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface AdmissionFormData {
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
}

const admissionSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  className: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  mobile: z.string().min(7, "Invalid mobile number").optional().or(z.literal("")),
  parentName: z.string().optional(),
  parentMobile: z.string().optional(),
  address: z.string().optional(),
  admissionDate: z.string().optional(),
  notes: z.string().optional(),
  amountPaid: z.preprocess((value) => value === '' || value === undefined ? 0 : Number(value), z.number().min(0)).optional(),
  remainingAmount: z.preprocess((value) => value === '' || value === undefined ? 0 : Number(value), z.number().min(0)).optional(),
  status: z.enum(["Pending", "Confirmed", "Rejected"]),
});

type AdmissionFormValues = z.infer<typeof admissionSchema>;

interface AdminAdmissionFormProps {
  onClose: () => void;
  onSuccess: (data: AdmissionFormValues) => Promise<void>;
  formId?: string;
  initialData?: Partial<AdmissionFormValues>;
}

const CLASSES = ["Beginner - Kids", "Intermediate - Teens", "Advanced", "Professional"];
const STATUS_OPTIONS = ["Pending", "Confirmed", "Rejected"] as const;

export default function AdminAdmissionForm({
  onClose,
  onSuccess,
  formId = "admin-admission-form",
  initialData,
}: AdminAdmissionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      fullName: initialData?.fullName || "",
      className: initialData?.className || "",
      email: initialData?.email || "",
      mobile: initialData?.mobile || "",
      parentName: initialData?.parentName || "",
      parentMobile: initialData?.parentMobile || "",
      address: initialData?.address || "",
      admissionDate: initialData?.admissionDate || "",
      notes: initialData?.notes || "",
      amountPaid: initialData?.amountPaid || 0,
      remainingAmount: initialData?.remainingAmount || 0,
      status: initialData?.status || "Pending",
    },
  });

  const amountPaid = watch("amountPaid");
  const remainingAmount = watch("remainingAmount");

  async function onSubmit(values: AdmissionFormValues) {
    try {
      setIsSubmitting(true);
      await onSuccess(values);
      reset();
    } catch (e) {
      const err = e as Error;
      console.error(e);
      toast.error(err?.message || "Unable to save admission");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
      {/* Row 1: Student Full Name */}
      <div className="col-span-1">
        <Label className="font-semibold mb-2 block">Student Full Name *</Label>
        <Input
          className="h-9 text-sm rounded-lg"
          {...register("fullName")}
          placeholder="e.g. Aarav Sharma"
          disabled={isSubmitting}
        />
        {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>}
      </div>

      {/* Row 1: Status */}
      <div className="col-span-1">
        <Label className="font-semibold mb-2 block">Status</Label>
        <Select
          defaultValue={initialData?.status || "Pending"}
          onValueChange={(val) => setValue("status", val as "Pending" | "Confirmed" | "Rejected")}
        >
          <SelectTrigger className="h-9 text-sm rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: Course / Class */}
      <div className="col-span-1">
        <Label className="font-semibold mb-2 block">Course / Class</Label>
        <Select
          defaultValue={initialData?.className || ""}
          onValueChange={(val) => setValue("className", val)}
        >
          <SelectTrigger className="h-9 text-sm rounded-lg">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {CLASSES.map((cls) => (
              <SelectItem key={cls} value={cls}>
                {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: Email Address */}
      <div className="col-span-1">
        <Label className="font-semibold mb-2 block">Email Address</Label>
        <Input
          className="h-9 text-sm rounded-lg"
          type="email"
          {...register("email")}
          placeholder="parent@example.com"
          disabled={isSubmitting}
        />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
      </div>

      {/* Row 3: Mobile Number */}
      <div className="col-span-1">
        <Label className="font-semibold mb-2 block">Mobile Number</Label>
        <Input
          className="h-9 text-sm rounded-lg"
          {...register("mobile")}
          placeholder="Mobile number"
          disabled={isSubmitting}
        />
        {errors.mobile && <p className="text-xs text-destructive mt-1">{errors.mobile.message}</p>}
      </div>

      {/* Row 3: Parent Name */}
      <div className="col-span-1">
        <Label className="font-semibold mb-2 block">Parent Name</Label>
        <Input
          className="h-9 text-sm rounded-lg"
          {...register("parentName")}
          placeholder="Parent / Guardian name"
          disabled={isSubmitting}
        />
      </div>

      {/* Row 4: Parent Mobile */}
      <div className="col-span-1">
        <Label className="font-semibold mb-2 block">Parent Mobile</Label>
        <Input
          className="h-9 text-sm rounded-lg"
          {...register("parentMobile")}
          placeholder="Parent mobile number"
          disabled={isSubmitting}
        />
      </div>

      {/* Row 4: Admission Date */}
      <div className="col-span-1">
        <Label className="font-semibold mb-2 block">Admission Date</Label>
        <Input
          className="h-9 text-sm rounded-lg"
          type="date"
          {...register("admissionDate")}
          disabled={isSubmitting}
        />
      </div>

      {/* Row 5: Amount Paid */}
      <div className="col-span-1">
        <Label className="font-semibold mb-2 block">Amount Paid (₹)</Label>
        <Input
          className="h-9 text-sm rounded-lg"
          type="number"
          {...register("amountPaid")}
          placeholder="0"
          min="0"
          disabled={isSubmitting}
        />
        {amountPaid !== undefined && <p className="text-xs text-muted-foreground mt-1">₹{Number(amountPaid).toLocaleString("en-IN")}</p>}
      </div>

      {/* Row 5: Remaining Amount */}
      <div className="col-span-1">
        <Label className="font-semibold mb-2 block">Remaining Amount (₹)</Label>
        <Input
          className="h-9 text-sm rounded-lg"
          type="number"
          {...register("remainingAmount")}
          placeholder="0"
          min="0"
          disabled={isSubmitting}
        />
        {remainingAmount !== undefined && <p className="text-xs text-muted-foreground mt-1">₹{Number(remainingAmount).toLocaleString("en-IN")}</p>}
      </div>

      {/* Row 6: Address (Full Width) */}
      <div className="col-span-1 sm:col-span-2">
        <Label className="font-semibold mb-2 block">Address</Label>
        <Textarea
          className="text-sm rounded-lg min-h-20"
          {...register("address")}
          placeholder="Complete address"
          disabled={isSubmitting}
        />
      </div>

      {/* Row 7: Notes (Full Width) */}
      <div className="col-span-1 sm:col-span-2">
        <Label className="font-semibold mb-2 block">Notes / Remarks</Label>
        <Textarea
          className="text-sm rounded-lg min-h-20"
          {...register("notes")}
          placeholder="Any special notes or remarks about this admission"
          disabled={isSubmitting}
        />
      </div>
    </form>
  );
}
