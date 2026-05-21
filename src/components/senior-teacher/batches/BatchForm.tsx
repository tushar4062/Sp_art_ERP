"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, X } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { batchWriteSchema, type BatchWriteInput, BATCH_DAY_OPTIONS, COURSE_OPTIONS } from "@/lib/validators/batch";
import type { SerializedBatch } from "@/lib/batch/types";
import { batchFetch } from "@/lib/batch/batchFetch";
import { useBatchRoutes } from "@/lib/batch/useBatchRoutes";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";

type TeacherBrief = { id: string; fullName: string; email: string };

const emptyDefaults: BatchWriteInput = {
  batchName: "",
  courseName: "",
  batchDay: "",
  batchTime: "",
  startMonth: "",
  endMonth: "",
  branch: "",
  batchCapacity: 24,
  description: "",
  students: [],
  teacherIds: [],
};

function batchToFormInput(b: SerializedBatch): BatchWriteInput {
  return {
    batchName: b.batchName,
    courseName: b.courseName,
    batchDay: b.batchDay,
    batchTime: b.batchTime,
    startMonth: b.startMonth,
    endMonth: b.endMonth,
    branch: b.branch,
    batchCapacity: b.batchCapacity,
    description: b.description || "",
    teacherIds: b.teacherIds || [],
    students: b.students.map(s => ({
      studentName: s.studentName,
      studentEmail: s.studentEmail || "",
      phone: s.phone || "",
      course: s.course || "",
      batchDay: s.batchDay || "",
      batchTime: s.batchTime || "",
      startMonth: s.startMonth || "",
      endMonth: s.endMonth || "",
    })),
  };
}

export function BatchForm({ mode, batchId, initial }: { mode: "create" | "edit"; batchId?: string; initial?: SerializedBatch | null }) {
  const router = useRouter();
  const routes = useBatchRoutes();
  const [teacherList, setTeacherList] = useState<TeacherBrief[]>([]);
  const [studentModal, setStudentModal] = useState(false);
  const [draft, setDraft] = useState({
    studentName: "",
    studentEmail: "",
    phone: "",
    course: "",
    batchDay: "",
    batchTime: "",
    startMonth: "",
    endMonth: "",
  });
  const [saving, setSaving] = useState(false);

  const form = useForm<BatchWriteInput>({
    resolver: zodResolver(batchWriteSchema),
    defaultValues: initial ? batchToFormInput(initial) : emptyDefaults,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "students" });

  const courseName = form.watch("courseName");
  const batchDay = form.watch("batchDay");

  const onInvalid = () => {
    toast.error("Please fill in all required batch fields.");
  };

  useEffect(() => {
    if (initial) {
      form.reset(batchToFormInput(initial));
    }
  }, [initial, form]);

  useEffect(() => {
    (async () => {
      try {
        const res = await batchFetch("/api/senior-teacher/teachers?brief=1");
        const json = await res.json();
        if (res.ok && json.data?.teachers) setTeacherList(json.data.teachers);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const teacherIds = form.watch("teacherIds") || [];

  const toggleTeacher = (id: string) => {
    const cur = form.getValues("teacherIds") || [];
    if (cur.includes(id)) {
      form.setValue(
        "teacherIds",
        cur.filter(x => x !== id),
        { shouldValidate: true },
      );
    } else {
      form.setValue("teacherIds", [...cur, id], { shouldValidate: true });
    }
  };

  const addDraftStudent = () => {
    if (!draft.studentName.trim()) {
      toast.error("Student name is required");
      return;
    }
    append({
      studentName: draft.studentName.trim(),
      studentEmail: draft.studentEmail.trim(),
      phone: draft.phone.trim(),
      course: draft.course.trim(),
      batchDay: draft.batchDay.trim(),
      batchTime: draft.batchTime.trim(),
      startMonth: draft.startMonth.trim(),
      endMonth: draft.endMonth.trim(),
    });
    setDraft({
      studentName: "",
      studentEmail: "",
      phone: "",
      course: "",
      batchDay: "",
      batchTime: "",
      startMonth: "",
      endMonth: "",
    });
    setStudentModal(false);
    toast.success("Student added to roster");
  };

  const onSubmit = async (data: BatchWriteInput) => {
    setSaving(true);
    try {
      const url = mode === "create" ? "/api/senior-teacher/batches" : `/api/senior-teacher/batches/${batchId}`;
      const res = await batchFetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 403) {
        toast.error(json.error || "You do not have permission to save batches");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Save failed");
      const batchIdSaved = json?.data?.batch?.id as string | undefined;
      if (!batchIdSaved) throw new Error("Invalid response from server");
      if (json.warnings?.length) {
        json.warnings.forEach((w: string) => toast.message(w));
      }
      toast.success(json.message || "Saved");
      router.push(routes.detail(batchIdSaved));
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to save batch"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" asChild>
          <Link href={routes.list}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <PageHeader title={mode === "create" ? "Create batch" : "Edit batch"} subtitle="Fill in schedule, roster, and teacher assignments." />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="font-display font-semibold text-lg">Batch details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Batch name</Label>
              <Input className="rounded-xl" {...form.register("batchName")} />
              {form.formState.errors.batchName && (
                <p className="text-sm text-red-600">{form.formState.errors.batchName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Course name</Label>
              <Select
                value={courseName || undefined}
                onValueChange={v => form.setValue("courseName", v, { shouldValidate: true })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {COURSE_OPTIONS.map(c => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.courseName && (
                <p className="text-sm text-red-600">{form.formState.errors.courseName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Batch day pattern</Label>
              <Select
                value={batchDay || undefined}
                onValueChange={v => form.setValue("batchDay", v, { shouldValidate: true })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select pattern" />
                </SelectTrigger>
                <SelectContent>
                  {BATCH_DAY_OPTIONS.map(d => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.batchDay && (
                <p className="text-sm text-red-600">{form.formState.errors.batchDay.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Batch time</Label>
              <Input className="rounded-xl" placeholder="e.g. 4:00 PM – 5:30 PM" {...form.register("batchTime")} />
              {form.formState.errors.batchTime && (
                <p className="text-sm text-red-600">{form.formState.errors.batchTime.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Start month</Label>
              <Input type="month" className="rounded-xl" {...form.register("startMonth")} />
              {form.formState.errors.startMonth && (
                <p className="text-sm text-red-600">{form.formState.errors.startMonth.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>End month</Label>
              <Input type="month" className="rounded-xl" {...form.register("endMonth")} />
              {form.formState.errors.endMonth && (
                <p className="text-sm text-red-600">{form.formState.errors.endMonth.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Input className="rounded-xl" {...form.register("branch")} />
              {form.formState.errors.branch && (
                <p className="text-sm text-red-600">{form.formState.errors.branch.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Batch capacity</Label>
              <Input type="number" min={1} className="rounded-xl" {...form.register("batchCapacity", { valueAsNumber: true })} />
              {form.formState.errors.batchCapacity && (
                <p className="text-sm text-red-600">{form.formState.errors.batchCapacity.message}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={3} className="rounded-xl resize-none" {...form.register("description")} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-semibold text-lg">Students in this batch</h2>
            <Button type="button" variant="secondary" className="rounded-xl" onClick={() => setStudentModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add New Student
            </Button>
          </div>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students added yet. You can add multiple entries (including duplicates).</p>
          ) : (
            <ul className="space-y-2">
              {fields.map((f, idx) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-900">{form.watch(`students.${idx}.studentName`)}</span>
                  <span className="text-muted-foreground">{form.watch(`students.${idx}.studentEmail`)}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => remove(idx)}>
                    <X className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-display font-semibold text-lg">Assign teachers</h2>
          <p className="text-sm text-muted-foreground">Select one or more teachers. They receive an email when the batch is created.</p>
          <div className="flex flex-wrap gap-2">
            {teacherIds.map(id => {
              const t = teacherList.find(x => x.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-medium"
                >
                  {t?.fullName || id}
                  <button type="button" className="ml-1 hover:text-red-600" onClick={() => toggleTeacher(id)} aria-label="Remove">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
          <ScrollArea className="h-56 rounded-xl border border-slate-100">
            <div className="p-3 space-y-2">
              {teacherList.map(t => (
                <label key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 cursor-pointer">
                  <Checkbox checked={teacherIds.includes(t.id)} onCheckedChange={() => toggleTeacher(t.id)} />
                  <span className="text-sm">
                    <span className="font-medium">{t.fullName}</span>
                    <span className="text-muted-foreground block text-xs">{t.email}</span>
                  </span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="rounded-xl gradient-primary text-white border-0 px-8">
            {saving ? "Saving…" : mode === "create" ? "Create batch" : "Save changes"}
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" asChild>
            <Link href={routes.list}>Cancel</Link>
          </Button>
        </div>
      </form>

      <Dialog open={studentModal} onOpenChange={setStudentModal}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add student to roster</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Student name</Label>
              <Input className="rounded-xl" value={draft.studentName} onChange={e => setDraft({ ...draft, studentName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Student email</Label>
              <Input className="rounded-xl" value={draft.studentEmail} onChange={e => setDraft({ ...draft, studentEmail: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone number</Label>
              <Input className="rounded-xl" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Course</Label>
              <Input className="rounded-xl" value={draft.course} onChange={e => setDraft({ ...draft, course: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Batch day</Label>
                <Input className="rounded-xl" value={draft.batchDay} onChange={e => setDraft({ ...draft, batchDay: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Batch time</Label>
                <Input className="rounded-xl" value={draft.batchTime} onChange={e => setDraft({ ...draft, batchTime: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Start month</Label>
                <Input type="month" className="rounded-xl" value={draft.startMonth} onChange={e => setDraft({ ...draft, startMonth: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End month</Label>
                <Input type="month" className="rounded-xl" value={draft.endMonth} onChange={e => setDraft({ ...draft, endMonth: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setStudentModal(false)}>
              Close
            </Button>
            <Button type="button" className="rounded-xl" onClick={addDraftStudent}>
              Add to batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
