import type { HydratedDocument } from "mongoose";
import bcrypt from "bcryptjs";
import Credential, { type CredentialDocument } from "@/lib/models/Credentials";
import Student, { type StudentDocument } from "@/lib/models/Student";
import { verifyCredentialPassword } from "@/lib/auth/verifyCredentialPassword";

export type StudentHydrated = HydratedDocument<StudentDocument>;

export type StudentProfileDto = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  age: number | null;
  gender: string;
  studentId: string;
  profileImage: string;
  batchName: string;
  batchTiming: string;
  courseName: string;
  teacherName: string;
  role: string;
  classes: {
    id: string;
    batchName: string;
    batchTiming: string;
    courseName: string;
    teacherName: string;
  }[];
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toProfileDto(doc: StudentDocument): StudentProfileDto {
  return {
    id: doc._id.toString(),
    fullName: doc.fullName,
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    age: doc.age ?? null,
    gender: doc.gender ?? "",
    studentId: doc.badgeId,
    profileImage: doc.photo ?? "",
    batchName: doc.className ?? "",
    batchTiming: "",
    courseName: doc.className ?? "",
    teacherName: "",
    role: "student",
    classes: [],
  };
}

/** Read from existing `students` collection only — never inserts. */
export async function findStudentByEmail(
  email: string,
  options?: { withPassword?: boolean },
): Promise<StudentHydrated | null> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) return null;

  let query = Student.findOne({
    email: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") },
  });
  if (options?.withPassword) {
    query = query.select("+passwordHash");
  }
  return query;
}

/** Read from existing `students` collection only — never inserts. */
export async function findStudentById(
  id: string,
  options?: { withPassword?: boolean },
): Promise<StudentHydrated | null> {
  let query = Student.findById(id);
  if (options?.withPassword) {
    query = query.select("+passwordHash");
  }
  return query;
}

/** Save portal password on an existing student row (admin credential setup). */
export async function syncStudentPortalPassword(
  student: StudentHydrated,
  passwordHash: string,
) {
  if (!student.passwordHash) {
    student.passwordHash = passwordHash;
    await student.save();
  }
  return student;
}

/**
 * Login using only documents already in `students`.
 * Does not create students, credentials, or any other collection rows.
 */
export async function authenticateStudentLogin(
  email: string,
  password: string,
): Promise<StudentHydrated | null> {
  const normalized = email.toLowerCase().trim();
  const student = await findStudentByEmail(normalized, { withPassword: true });

  if (!student) {
    return null;
  }

  if (student.passwordHash) {
    try {
      if (await bcrypt.compare(password, student.passwordHash)) return student;
    } catch {
      /* fall through to credentials */
    }
  }

  const credential = await Credential.findOne({
    email: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") },
    role: "student",
  });
  if (!credential || credential.accountStatus !== "Active") {
    return null;
  }

  const valid = await verifyCredentialPassword(credential as CredentialDocument, password);
  if (!valid) return null;

  student.passwordHash = credential.passwordHash;
  await student.save();
  return student;
}

export type StudentProfileUpdate = {
  fullName?: string;
  phone?: string;
  age?: number | null;
  gender?: string;
  profileImage?: string;
};

/** Update existing `students` document only — never inserts. */
export async function updateStudentProfile(
  studentId: string,
  sessionEmail: string,
  data: StudentProfileUpdate,
): Promise<StudentHydrated | null> {
  let student = await findStudentById(studentId);
  if (!student && sessionEmail) {
    student = await findStudentByEmail(sessionEmail);
  }
  if (!student) return null;

  if (data.fullName !== undefined) student.fullName = data.fullName;
  if (data.phone !== undefined) student.phone = data.phone;
  if (data.age !== undefined) student.age = data.age ?? undefined;
  if (data.gender !== undefined) student.gender = data.gender;
  if (data.profileImage !== undefined) {
    student.photo = data.profileImage || undefined;
  }

  await student.save();
  return student;
}
