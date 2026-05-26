"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, MessageSquarePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";

const schema = z.object({
  seniorTeacherName: z.string().trim().min(2, "Name is required (min 2 characters)"),
  seniorTeacherEmail: z.string().trim().email("Enter a valid email address"),
  remarks: z.string().trim().min(10, "Remarks must be at least 10 characters"),
});

type FormValues = z.infer<typeof schema>;

export function SeniorTeacherQueryRequestModal({
  open,
  onOpenChange,
  defaultName,
  defaultEmail,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  defaultEmail: string;
  onSubmitted: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      seniorTeacherName: defaultName,
      seniorTeacherEmail: defaultEmail,
      remarks: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        seniorTeacherName: defaultName,
        seniorTeacherEmail: defaultEmail,
        remarks: "",
      });
    }
  }, [open, defaultName, defaultEmail, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await fetch("/api/senior-teacher/queries", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await parseJsonResponse<{
        error?: string;
        message?: string;
        data?: { emailWarnings?: string[] };
      }>(res);
      if (!res.ok) throw new Error(json.error || "Failed to submit query");

      const warnings = json.data?.emailWarnings ?? [];
      if (warnings.length) {
        toast.warning("Query saved. Admin email could not be sent — check SMTP in .env");
      } else {
        toast.success(json.message || "Query submitted successfully");
      }
      onOpenChange(false);
      onSubmitted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md border-border/80 shadow-xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Request Query Form
          </DialogTitle>
        </DialogHeader>

        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="stq-name">Name</Label>
            <Input id="stq-name" className="rounded-xl" {...register("seniorTeacherName")} />
            {errors.seniorTeacherName && (
              <p className="text-xs text-destructive">{errors.seniorTeacherName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stq-email">Email</Label>
            <Input id="stq-email" type="email" className="rounded-xl" {...register("seniorTeacherEmail")} />
            {errors.seniorTeacherEmail && (
              <p className="text-xs text-destructive">{errors.seniorTeacherEmail.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stq-remarks">Remarks / Query message</Label>
            <Textarea
              id="stq-remarks"
              rows={4}
              className="rounded-xl resize-none"
              placeholder="Describe what you need to update on your profile…"
              {...register("remarks")}
            />
            {errors.remarks && (
              <p className="text-xs text-destructive">{errors.remarks.message}</p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl flex-1 gradient-primary text-white border-0"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit
            </Button>
          </div>
        </motion.form>
      </DialogContent>
    </Dialog>
  );
}
