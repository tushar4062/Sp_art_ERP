import type { StudentDocument } from "@/lib/models/Student";

type StudentLike = Pick<
  StudentDocument,
  | "fullName"
  | "email"
  | "phone"
  | "gender"
  | "age"
  | "currentCourse"
  | "className"
  | "parentName"
  | "fatherName"
  | "fatherMobile"
  | "motherMobile"
  | "address"
  | "photo"
  | "feeStatus"
  | "artTeacher"
  | "createdBy"
> & {
  _id: { toString(): string };
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export function formatStudentDate(value: Date | string | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

export function studentStatus(doc: { feeStatus?: string }): "Active" | "Inactive" {
  return doc.feeStatus === "Paid" ? "Active" : "Inactive";
}

function toIso(value: Date | string | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export function toStudentJson(doc: StudentDocument | StudentLike) {
  return {
    id: doc._id.toString(),
    fullName: doc.fullName,
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    gender: doc.gender ?? "",
    age: doc.age ?? null,
    course: doc.currentCourse ?? "",
    className: doc.className,
    parentName: doc.parentName ?? doc.fatherName ?? "",
    parentContact: doc.fatherMobile ?? doc.motherMobile ?? doc.phone ?? "",
    address: doc.address ?? "",
    profileImage: doc.photo ?? "",
    status: studentStatus(doc),
    feeStatus: doc.feeStatus,
    attendancePercentage: 0,
    joiningDate: formatStudentDate(doc.createdAt),
    artTeacher: doc.artTeacher ?? "",
    createdBy: doc.createdBy?.toString?.() ?? (doc.createdBy ? String(doc.createdBy) : ""),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}
