import type { TeacherDocument } from "@/lib/models/Teacher";

type TeacherLike = Pick<
  TeacherDocument,
  | "fullName"
  | "email"
  | "phone"
  | "gender"
  | "age"
  | "specialization"
  | "currentSubjectCourse"
  | "experience"
  | "qualification"
  | "joiningDate"
  | "address"
  | "photo"
  | "salary"
  | "status"
  | "badgeId"
  | "role"
  | "createdBy"
> & {
  _id: { toString(): string };
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

function toIso(value: Date | string | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export function formatTeacherDate(value: Date | string | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

export function toTeacherJson(doc: TeacherDocument | TeacherLike) {
  return {
    id: doc._id.toString(),
    fullName: doc.fullName,
    email: doc.email,
    phone: doc.phone ?? "",
    gender: doc.gender ?? "",
    age: doc.age ?? null,
    specialization: doc.specialization,
    subject: doc.currentSubjectCourse ?? "",
    experience: doc.experience,
    qualification: doc.qualification ?? "",
    joiningDate: formatTeacherDate(doc.joiningDate ?? doc.createdAt),
    address: doc.address ?? "",
    profileImage: doc.photo ?? "",
    salary: doc.salary ?? null,
    status: doc.status,
    teacherId: doc.badgeId ?? "",
    role: doc.role ?? "",
    createdBy: doc.createdBy?.toString?.() ?? (doc.createdBy ? String(doc.createdBy) : ""),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}
