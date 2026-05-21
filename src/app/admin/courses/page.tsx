"use client";

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const courseSchema = z.object({
  courseTitle: z.string().min(1, 'Course title is required'),
  courseCode: z.string().min(1, 'Course code is required'),
  instructor: z.string().optional(),
  duration: z.coerce.number().min(1, 'Duration is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  totalFees: z.coerce.number().min(0, 'Total fees is required'),
  discountFees: z.coerce.number().min(0, 'Discount fees is required'),
  status: z.enum(['active', 'inactive']).default('active'),
  notes: z.string().optional(),
});

type CourseForm = z.infer<typeof courseSchema>;
type CourseRow = {
  id: string;
  courseTitle: string;
  courseCode: string;
  instructor?: string;
  duration: number;
  startDate: string;
  endDate: string;
  totalFees: number;
  discountFees: number;
  discountPercentage: number;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
};

type CourseStatusFilter = 'All' | 'active' | 'inactive';

function formatDate(value: string) {
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminCoursesPage() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<CourseRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<CourseStatusFilter>('All');
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);

  const form = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      courseTitle: '',
      courseCode: '',
      instructor: '',
      duration: 1,
      startDate: '',
      endDate: '',
      totalFees: 0,
      discountFees: 0,
      status: 'active',
      notes: '',
    },
  });

  const totalFeesValue = Number(form.watch('totalFees') ?? 0);
  const discountFeesValue = Number(form.watch('discountFees') ?? 0);
  const discountPercentageValue = totalFeesValue > 0
    ? Math.max(0, Math.round(((totalFeesValue - discountFeesValue) / totalFeesValue) * 100))
    : 0;

  const filteredRows = useMemo(() => {
    const filtered = statusFilter === 'All'
      ? rows
      : rows.filter((row) => row.status === statusFilter);
    return filtered;
  }, [rows, statusFilter]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/courses');
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to load courses');
      }
      setRows(result.courses ?? []);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Unable to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const clearForm = () => {
    form.reset({
      courseTitle: '',
      courseCode: '',
      instructor: '',
      duration: 1,
      startDate: '',
      endDate: '',
      totalFees: 0,
      discountFees: 0,
      status: 'active',
      notes: '',
    });
    setEditing(null);
  };

  const openAddCourse = () => {
    clearForm();
    setOpen(true);
  };

  const openEditCourse = (row: CourseRow) => {
    setEditing(row);
    form.reset({
      courseTitle: row.courseTitle,
      courseCode: row.courseCode,
      instructor: row.instructor ?? '',
      duration: row.duration,
      startDate: row.startDate,
      endDate: row.endDate,
      totalFees: row.totalFees,
      discountFees: row.discountFees,
      status: row.status,
      notes: row.notes ?? '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || 'Failed to delete course');
        return;
      }
      setRows((prev) => prev.filter((row) => row.id !== id));
      toast.success(result.message || 'Course deleted successfully');
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  const onSubmit = async (values: CourseForm) => {
    try {
      const discountPercentage = values.totalFees > 0
        ? Math.max(0, Math.round(((values.totalFees - values.discountFees) / values.totalFees) * 100))
        : 0;

      const payload = {
        courseTitle: values.courseTitle,
        courseCode: values.courseCode,
        instructor: values.instructor || undefined,
        duration: Number(values.duration),
        startDate: values.startDate,
        endDate: values.endDate,
        totalFees: Number(values.totalFees),
        discountFees: Number(values.discountFees),
        discountPercentage,
        status: values.status,
        notes: values.notes || undefined,
      };
      const url = editing ? `/api/courses/${editing.id}` : '/api/courses';
      const method = editing ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || 'Failed to save course');
        return;
      }

      const newCourse: CourseRow = {
        id: result.course.id,
        courseTitle: result.course.courseTitle,
        courseCode: result.course.courseCode,
        instructor: result.course.instructor,
        duration: result.course.duration,
        startDate: result.course.startDate,
        endDate: result.course.endDate,
        totalFees: result.course.totalFees,
        discountFees: result.course.discountFees,
        discountPercentage: result.course.discountPercentage,
        status: result.course.status,
        notes: result.course.notes,
        createdAt: result.course.createdAt,
      };

      if (editing) {
        setRows((prev) => prev.map((row) => (row.id === editing.id ? newCourse : row)));
        toast.success('Course updated successfully');
      } else {
        setRows((prev) => [newCourse, ...prev]);
        toast.success('Course created successfully');
      }

      setOpen(false);
      clearForm();
    } catch (error) {
      console.error('Error saving course:', error);
      toast.error('Failed to save course');
    }
  };

  const modalTitle = editing ? 'Edit Course' : 'Add New Course';
  const emptyStateText = statusFilter === 'All' ? 'No courses yet.' : `No ${statusFilter.toLowerCase()} courses found.`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        subtitle="Manage course offerings, instructors, and pricing for the academy."
        action={
          <Button onClick={openAddCourse}>
            <Plus className="w-4 h-4" /> Add New Course
          </Button>
        }
      />

      <div className="card-soft p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['All', 'active', 'inactive'] as CourseStatusFilter[]).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? 'secondary' : 'outline'}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'All' ? status : status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredRows.length} course{filteredRows.length === 1 ? '' : 's'} shown
        </div>
      </div>

      <div className="card-soft overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading courses…</div>
        ) : (
          <DataTable
            columns={[
              { key: 'courseTitle', header: 'Course' },
              { key: 'courseCode', header: 'Code' },
              { key: 'instructor', header: 'Instructor' },
              { key: 'duration', header: 'Duration', render: row => `${row.duration} months` },
              { key: 'startDate', header: 'Start Date', render: row => formatDate(row.startDate) },
              { key: 'endDate', header: 'End Date', render: row => formatDate(row.endDate) },
              { key: 'totalFees', header: 'Total Fees', render: row => `₹${row.totalFees.toFixed(2)}` },
              { key: 'discountFees', header: 'Discount Fees', render: row => `₹${row.discountFees.toFixed(2)}` },
              { key: 'discountPercentage', header: 'Discount %', render: row => `${row.discountPercentage}%` },
              { key: 'status', header: 'Status', render: row => (
                <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${row.status === 'active' ? 'bg-success/15 text-success' : 'bg-muted/15 text-muted-foreground'}`}>
                  {row.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              ) },
              { key: 'actions', header: 'Actions', render: row => (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditCourse(row)}>
                    <Pencil className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(row.id)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>
              ) },
            ]}
            rows={filteredRows}
            searchKeys={['courseTitle', 'courseCode', 'instructor']}
            emptyMessage={emptyStateText}
          />
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 mt-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-2 md:grid-cols-2 md:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="courseTitle">Course Title</Label>
                <Input id="courseTitle" {...form.register('courseTitle')} />
                {form.formState.errors.courseTitle && <p className="text-xs text-red-500">{form.formState.errors.courseTitle.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="courseCode">Course Code</Label>
                <Input id="courseCode" {...form.register('courseCode')} />
                {form.formState.errors.courseCode && <p className="text-xs text-red-500">{form.formState.errors.courseCode.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="instructor">Instructor</Label>
                <Input id="instructor" {...form.register('instructor')} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration">Duration (months)</Label>
                <Input id="duration" type="number" min={1} step={1} {...form.register('duration', { valueAsNumber: true })} />
                {form.formState.errors.duration && <p className="text-xs text-red-500">{form.formState.errors.duration.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Popover open={startDatePickerOpen} onOpenChange={setStartDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="justify-between w-full">
                      {form.watch('startDate') ? formatDate(form.watch('startDate')) : 'Pick a start date'}
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch('startDate') ? new Date(form.watch('startDate')) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          form.setValue('startDate', date.toISOString().slice(0, 10));
                          setStartDatePickerOpen(false);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.startDate && <p className="text-xs text-red-500">{form.formState.errors.startDate.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="totalFees">Total Fees</Label>
                <Input id="totalFees" type="number" min={0} step={0.01} {...form.register('totalFees', { valueAsNumber: true })} />
                {form.formState.errors.totalFees && <p className="text-xs text-red-500">{form.formState.errors.totalFees.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="justify-between w-full">
                      {form.watch('endDate') ? formatDate(form.watch('endDate')) : 'Pick an end date'}
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch('endDate') ? new Date(form.watch('endDate')) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          form.setValue('endDate', date.toISOString().slice(0, 10));
                          setEndDatePickerOpen(false);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.endDate && <p className="text-xs text-red-500">{form.formState.errors.endDate.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discountFees">Discount Fees</Label>
                <Input id="discountFees" type="number" min={0} step={0.01} {...form.register('discountFees', { valueAsNumber: true })} />
                {form.formState.errors.discountFees && <p className="text-xs text-red-500">{form.formState.errors.discountFees.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discountPercentage">Discount (%)</Label>
                <Input id="discountPercentage" value={`${discountPercentageValue}% OFF`} readOnly />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={form.watch('status')} onValueChange={(value) => form.setValue('status', value as 'active' | 'inactive')}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.status && <p className="text-xs text-red-500">{form.formState.errors.status.message}</p>}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...form.register('notes')} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); clearForm(); }}>
                Cancel
              </Button>
              <Button type="submit">Save Course</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
