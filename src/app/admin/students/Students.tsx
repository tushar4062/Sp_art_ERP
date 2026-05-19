'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Plus, Search, Pencil, Eye, UploadCloud } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar } from '@/components/shared/Avatar';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

type Student = {
  id: string;
  name: string;
  email?: string;
  badgeId: string;
  class: string;
  feeStatus: 'Paid' | 'Pending' | 'Overdue';
  phone?: string;
  photo?: string;
  createdAt: string;
  parentName?: string;
  dob?: string;
  age?: number;
  bloodGroup?: string;
  gender?: string;
  school?: string;
  college?: string;
  occupation?: string;
  fatherName?: string;
  fatherMobile?: string;
  motherName?: string;
  motherMobile?: string;
  address?: string;
  currentCourse?: string;
  batchDays?: string;
  batchTime?: string;
  courseDurationMonths?: number;
  artTeacher?: string;
  vanFacility?: boolean;
};

type StudentForm = {
  id?: string;
  fullName: string;
  email: string;
  badgeId: string;
  className: string;
  feeStatus: 'Paid' | 'Pending' | 'Overdue';
  phone: string;
  photo: string;
  dob: string;
  age: number;
  bloodGroup: string;
  gender: string;
  school: string;
  college: string;
  occupation: string;
  fatherName: string;
  fatherMobile: string;
  motherName: string;
  motherMobile: string;
  address: string;
  currentCourse: string;
  batchDays: string;
  batchTime: string;
  courseDurationMonths: number;
  artTeacher: string;
  vanFacility: boolean;
};

const CLASSES = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];
const FEE_STATUS = ['Paid', 'Pending', 'Overdue'] as const;
const DURATIONS = ['3 months', '6 months', '12 months', '18 months', '24 months'];

const defaultForm: StudentForm = {
  fullName: '',
  email: '',
  badgeId: '',
  className: 'Not Assigned',
  feeStatus: 'Pending',
  phone: '',
  photo: '',
  dob: '',
  age: 0,
  bloodGroup: '',
  gender: '',
  school: '',
  college: '',
  occupation: '',
  fatherName: '',
  fatherMobile: '',
  motherName: '',
  motherMobile: '',
  address: '',
  currentCourse: '',
  batchDays: '',
  batchTime: '',
  courseDurationMonths: 12,
  artTeacher: '',
  vanFacility: false,
};

const formatDateInputValue = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const mapStudentToForm = (student: Student): StudentForm => ({
  id: student.id,
  fullName: student.name ?? '',
  email: student.email ?? '',
  badgeId: student.badgeId ?? '',
  className: student.class ?? 'Not Assigned',
  feeStatus: student.feeStatus ?? 'Pending',
  phone: student.phone ?? '',
  photo: student.photo ?? '',
  dob: formatDateInputValue(student.dob),
  age: student.age ?? 0,
  bloodGroup: student.bloodGroup ?? '',
  gender: student.gender ?? '',
  school: student.school ?? '',
  college: student.college ?? '',
  occupation: student.occupation ?? '',
  fatherName: student.fatherName ?? '',
  fatherMobile: student.fatherMobile ?? '',
  motherName: student.motherName ?? '',
  motherMobile: student.motherMobile ?? '',
  address: student.address ?? '',
  currentCourse: student.currentCourse ?? '',
  batchDays: student.batchDays ?? '',
  batchTime: student.batchTime ?? '',
  courseDurationMonths: student.courseDurationMonths ?? 12,
  artTeacher: student.artTeacher ?? '',
  vanFacility: student.vanFacility ?? false,
});

const buildStudentPayload = (form: StudentForm) => ({
  fullName: form.fullName,
  email: form.email || undefined,
  badgeId: form.badgeId,
  className: form.className,
  phone: form.phone || undefined,
  photo: form.photo || undefined,
  dob: form.dob || undefined,
  age: form.age || undefined,
  bloodGroup: form.bloodGroup || undefined,
  gender: form.gender || undefined,
  school: form.school || undefined,
  college: form.college || undefined,
  occupation: form.occupation || undefined,
  fatherName: form.fatherName || undefined,
  fatherMobile: form.fatherMobile || undefined,
  motherName: form.motherName || undefined,
  motherMobile: form.motherMobile || undefined,
  address: form.address || undefined,
  currentCourse: form.currentCourse || undefined,
  batchDays: form.batchDays || undefined,
  batchTime: form.batchTime || undefined,
  courseDurationMonths: form.courseDurationMonths,
  artTeacher: form.artTeacher || undefined,
  vanFacility: form.vanFacility,
  feeStatus: form.feeStatus,
});

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [filterFee, setFilterFee] = useState('All');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentForm>(defaultForm);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClass !== 'All') params.append('class', filterClass);
      if (filterFee !== 'All') params.append('feeStatus', filterFee);

      const response = await fetch(`/api/students?${params.toString()}`);
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [filterClass, filterFee]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (!form.dob) return;
    const date = new Date(form.dob);
    if (Number.isNaN(date.getTime())) return;
    const age = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    if (age !== form.age) {
      setForm(current => ({ ...current, age }));
    }
  }, [form.dob]);

  const openAddStudent = () => {
    setEditingStudent(null);
    setForm(defaultForm);
    setSheetOpen(true);
  };

  const openEditStudent = (student: Student) => {
    setEditingStudent(student);
    setForm(mapStudentToForm(student));
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingStudent(null);
    setForm(defaultForm);
  };

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'student-photos');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setForm(current => ({ ...current, photo: data.url }));
    } catch (error) {
      console.error('Photo upload error:', error);
      // Fallback to data URL if upload fails
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setForm(current => ({ ...current, photo: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = buildStudentPayload(form);
    const isEdit = Boolean(editingStudent?.id);
    const url = isEdit ? `/api/students/${editingStudent!.id}` : '/api/students';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to save student');
      }

      toast.success(isEdit ? 'Student updated successfully' : 'Student added successfully');
      closeSheet();
      await fetchStudents();
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error((error as Error).message || 'Unable to save student');
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const query = searchQuery.toLowerCase();
      const matchesQuery = !query ||
        student.name.toLowerCase().includes(query) ||
        student.badgeId.toLowerCase().includes(query) ||
        (student.email || '').toLowerCase().includes(query) ||
        student.class.toLowerCase().includes(query);
      
      const matchesClass = filterClass === 'All' || student.class === filterClass;
      const matchesFee = filterFee === 'All' || student.feeStatus === filterFee;
      
      return matchesQuery && matchesClass && matchesFee;
    });
  }, [students, searchQuery, filterClass, filterFee]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle={`${students.length} kids learning art with us`}
        action={
          <Button onClick={openAddStudent} className="rounded-xl gradient-primary text-white border-0 shadow-pop">
            <Plus className="w-4 h-4 mr-1" />
            Add Student
          </Button>
        }
      />

      <div className="card-soft p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, badge or email..."
            className="pl-9 rounded-xl"
          />
        </div>
        <Select value={filterClass} onValueChange={(value) => {
          setFilterClass(value);
          setCurrentPage(1);
        }}>
          <SelectTrigger className="rounded-xl sm:w-48">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All classes</SelectItem>
            {CLASSES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterFee} onValueChange={(value) => {
          setFilterFee(value);
          setCurrentPage(1);
        }}>
          <SelectTrigger className="rounded-xl sm:w-40">
            <SelectValue placeholder="Fee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All fees</SelectItem>
            {FEE_STATUS.map(f => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="card-soft overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading students...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {students.length === 0
              ? 'No students yet. Create credentials to add students automatically.'
              : 'No matching students found.'
            }
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Student',
                  render: (row) => {
                    const student = row as Student;
                    return (
                      <div className="flex items-center gap-3">
                        <Avatar name={student.name} src={student.photo} />
                        <div>
                          <div className="font-bold">{student.name}</div>
                          <div className="text-xs text-muted-foreground">{student.email || 'N/A'}</div>
                        </div>
                      </div>
                    );
                  },
                },
                {
                  key: 'badgeId',
                  header: 'Badge ID',
                  render: (row) => (
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      {row.badgeId}
                    </span>
                  ),
                },
                { key: 'class', header: 'Class' },
                {
                  key: 'feeStatus',
                  header: 'Fee Status',
                  render: (row) => (
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        row.feeStatus === 'Paid'
                          ? 'bg-green-100 text-green-800'
                          : row.feeStatus === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {row.feeStatus}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => {
                    const student = row as Student;
                    return (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditStudent(student)}>
                          <Pencil className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setViewStudent(student)}>
                          <Eye className="w-3 h-3 mr-1" /> View
                        </Button>
                      </div>
                    );
                  },
                },
              ]}
              rows={paginatedStudents}
            />
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 p-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Student Enrollment Form</SheetTitle>
          </SheetHeader>
          <form className="grid gap-6 py-4" onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Photo</Label>
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 rounded-2xl border border-dashed border-input bg-muted flex items-center justify-center overflow-hidden">
                    {form.photo ? (
                      <img src={form.photo} alt="Student" className="h-full w-full object-cover" />
                    ) : (
                      <UploadCloud className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <Button type="button" variant="outline" onClick={() => document.getElementById('student-photo-input')?.click()}>
                    Upload
                  </Button>
                  <input
                    id="student-photo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Student name</Label>
                  <Input id="fullName" value={form.fullName} onChange={(e) => setForm(current => ({ ...current, fullName: e.target.value }))} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="badgeId">Badge ID</Label>
                  <Input id="badgeId" value={form.badgeId} onChange={(e) => setForm(current => ({ ...current, badgeId: e.target.value }))} disabled={editingStudent !== null} required />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input id="dob" type="date" value={form.dob} onChange={(e) => setForm(current => ({ ...current, dob: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" type="number" value={form.age || ''} onChange={(e) => setForm(current => ({ ...current, age: Number(e.target.value) }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bloodGroup">Blood group</Label>
                  <Input id="bloodGroup" value={form.bloodGroup} onChange={(e) => setForm(current => ({ ...current, bloodGroup: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={form.gender} onValueChange={(value) => setForm(current => ({ ...current, gender: value }))}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => setForm(current => ({ ...current, phone: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="school">School</Label>
                  <Input id="school" value={form.school} onChange={(e) => setForm(current => ({ ...current, school: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="college">College</Label>
                  <Input id="college" value={form.college} onChange={(e) => setForm(current => ({ ...current, college: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input id="occupation" value={form.occupation} onChange={(e) => setForm(current => ({ ...current, occupation: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="fatherName">Father's name</Label>
                  <Input id="fatherName" value={form.fatherName} onChange={(e) => setForm(current => ({ ...current, fatherName: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fatherMobile">Father's mobile</Label>
                  <Input id="fatherMobile" value={form.fatherMobile} onChange={(e) => setForm(current => ({ ...current, fatherMobile: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="motherName">Mother's name</Label>
                  <Input id="motherName" value={form.motherName} onChange={(e) => setForm(current => ({ ...current, motherName: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="motherMobile">Mother's mobile</Label>
                  <Input id="motherMobile" value={form.motherMobile} onChange={(e) => setForm(current => ({ ...current, motherMobile: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" value={form.address} onChange={(e) => setForm(current => ({ ...current, address: e.target.value }))} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="className">Class</Label>
                  <Select value={form.className} onValueChange={(value) => setForm(current => ({ ...current, className: value }))}>
                    <SelectTrigger id="className">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Assigned">Not Assigned</SelectItem>
                      {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currentCourse">Current course</Label>
                  <Input id="currentCourse" value={form.currentCourse} onChange={(e) => setForm(current => ({ ...current, currentCourse: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="batchDays">Batch days</Label>
                  <Input id="batchDays" value={form.batchDays} onChange={(e) => setForm(current => ({ ...current, batchDays: e.target.value }))} placeholder="e.g. Mon, Wed, Fri" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="batchTime">Batch time</Label>
                  <Input id="batchTime" value={form.batchTime} onChange={(e) => setForm(current => ({ ...current, batchTime: e.target.value }))} placeholder="e.g. 4:00 - 5:30 PM" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="courseDurationMonths">Duration</Label>
                  <Select value={`${form.courseDurationMonths} months`} onValueChange={(value) => setForm(current => ({ ...current, courseDurationMonths: Number(value.split(' ')[0]) }))}>
                    <SelectTrigger id="courseDurationMonths">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map(duration => (
                        <SelectItem key={duration} value={duration}>{duration}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="artTeacher">Art teacher</Label>
                  <Select value={form.artTeacher} onValueChange={(value) => setForm(current => ({ ...current, artTeacher: value }))}>
                    <SelectTrigger id="artTeacher">
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mrs. Asha">Mrs. Asha</SelectItem>
                      <SelectItem value="Mr. Rohit">Mr. Rohit</SelectItem>
                      <SelectItem value="Ms. Priya">Ms. Priya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox checked={form.vanFacility} id="vanFacility" onCheckedChange={(value) => setForm(current => ({ ...current, vanFacility: Boolean(value) }))} />
                <Label htmlFor="vanFacility">Van facility required</Label>
              </div>
            </div>

            <div className="flex justify-between items-center gap-4 pt-4">
              <Button type="button" variant="outline" onClick={closeSheet}>Cancel</Button>
              <Button type="submit" className="w-full sm:w-auto rounded-xl gradient-primary text-white border-0 shadow-pop">
                {editingStudent ? 'Update Student' : 'Add Student'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={!!viewStudent} onOpenChange={(open) => !open && setViewStudent(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Student Profile</DialogTitle>
          </DialogHeader>
          {viewStudent && (
            <div className="grid gap-6 py-4">
              <div className="flex items-center justify-between gap-4 p-4 rounded-3xl border border-border bg-background">
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 rounded-3xl overflow-hidden bg-muted">
                    {viewStudent.photo ? (
                      <img src={viewStudent.photo} alt={viewStudent.name} className="h-full w-full object-cover" />
                    ) : (
                      <Avatar name={viewStudent.name} />
                    )}
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{viewStudent.name}</div>
                    <div className="text-sm text-muted-foreground">{viewStudent.email || 'No email provided'}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2 py-1">{viewStudent.class || 'Not Assigned'}</span>
                      <span className="rounded-full bg-muted px-2 py-1">{viewStudent.feeStatus}</span>
                      <span className="rounded-full bg-muted px-2 py-1">Badge: {viewStudent.badgeId}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>Teacher</div>
                  <div className="font-semibold">{viewStudent.artTeacher || 'Not assigned'}</div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-background p-5">
                  <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Personal details</div>
                  <div className="grid gap-2 text-sm">
                    <div><span className="font-medium">DOB:</span> {formatDateInputValue(viewStudent.dob) || 'N/A'}</div>
                    <div><span className="font-medium">Age:</span> {viewStudent.age ?? 'N/A'}</div>
                    <div><span className="font-medium">Gender:</span> {viewStudent.gender || 'N/A'}</div>
                    <div><span className="font-medium">Blood group:</span> {viewStudent.bloodGroup || 'N/A'}</div>
                    <div><span className="font-medium">Phone:</span> {viewStudent.phone || 'N/A'}</div>
                    <div><span className="font-medium">Address:</span> {viewStudent.address || 'N/A'}</div>
                  </div>
                </div>
                <div className="rounded-3xl border border-border bg-background p-5">
                  <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Parents / guardian</div>
                  <div className="grid gap-2 text-sm">
                    <div><span className="font-medium">Father:</span> {viewStudent.fatherName || 'N/A'}</div>
                    <div><span className="font-medium">Father mobile:</span> {viewStudent.fatherMobile || 'N/A'}</div>
                    <div><span className="font-medium">Mother:</span> {viewStudent.motherName || 'N/A'}</div>
                    <div><span className="font-medium">Mother mobile:</span> {viewStudent.motherMobile || 'N/A'}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-background p-5">
                  <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Education & occupation</div>
                  <div className="grid gap-2 text-sm">
                    <div><span className="font-medium">School:</span> {viewStudent.school || 'N/A'}</div>
                    <div><span className="font-medium">College:</span> {viewStudent.college || 'N/A'}</div>
                    <div><span className="font-medium">Occupation:</span> {viewStudent.occupation || 'N/A'}</div>
                  </div>
                </div>
                <div className="rounded-3xl border border-border bg-background p-5">
                  <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Course details</div>
                  <div className="grid gap-2 text-sm">
                    <div><span className="font-medium">Current course:</span> {viewStudent.currentCourse || 'N/A'}</div>
                    <div><span className="font-medium">Batch days:</span> {viewStudent.batchDays || 'N/A'}</div>
                    <div><span className="font-medium">Batch time:</span> {viewStudent.batchTime || 'N/A'}</div>
                    <div><span className="font-medium">Duration:</span> {viewStudent.courseDurationMonths ? `${viewStudent.courseDurationMonths} months` : 'N/A'}</div>
                    <div><span className="font-medium">Van facility:</span> {viewStudent.vanFacility ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
