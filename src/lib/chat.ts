import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Teacher from "@/lib/models/Teacher";
import SeniorTeacher from "@/lib/models/SeniorTeacher";
import Student from "@/lib/models/Student";
import ChatBlockedUser from "@/lib/models/ChatBlockedUser";
import {
  getAdminSessionTokenFromRequest,
  serverAdminCredentials,
  verifyAdminSessionToken,
} from "@/lib/auth/admin-session";
import {
  STUDENT_SESSION_COOKIE,
  TEACHER_SESSION_COOKIE,
  SENIOR_TEACHER_SESSION_COOKIE,
} from "@/lib/auth/portal-session";

export type ChatRole = "student" | "teacher" | "senior-teacher" | "admin" | "super-admin";

export interface ChatUser {
  id: string;
  role: ChatRole;
  name: string;
  email?: string;
}

// ChatSession was an empty alias of ChatUser — use ChatUser directly in return types.

const ADMIN_USER: ChatUser = {
  id: "admin",
  role: "admin",
  name: "Admin",
  email: serverAdminCredentials().email,
};

const SUPER_ADMIN_USER: ChatUser = {
  id: "super-admin",
  role: "super-admin",
  name: "Super Admin",
  email: "superadmin@littlebrushes.in",
};

export const CHAT_ROLE_LABELS: Record<ChatRole, string> = {
  student: "Student",
  teacher: "Teacher",
  "senior-teacher": "Senior Teacher",
  admin: "Admin",
  "super-admin": "Super Admin",
};

export async function getChatSessionFromRequest(
  request: NextRequest,
): Promise<
  | { ok: true; user: ChatUser }
  | { ok: false; response: NextResponse }
> {
  const adminToken = getAdminSessionTokenFromRequest(request);
  if (verifyAdminSessionToken(adminToken)) {
    return { ok: true, user: ADMIN_USER };
  }

  const studentId = request.cookies.get(STUDENT_SESSION_COOKIE)?.value;
  const teacherId = request.cookies.get(TEACHER_SESSION_COOKIE)?.value;
  const seniorTeacherId = request.cookies.get(SENIOR_TEACHER_SESSION_COOKIE)?.value;

  await dbConnect();

  if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
    const student = await Student.findById(studentId).select("fullName email");
    if (student) {
      return {
        ok: true,
        user: {
          id: student._id.toString(),
          role: "student",
          name: student.fullName,
          email: student.email ?? undefined,
        },
      };
    }
  }

  if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
    const teacher = await Teacher.findById(teacherId).select("fullName email");
    if (teacher) {
      return {
        ok: true,
        user: {
          id: teacher._id.toString(),
          role: "teacher",
          name: teacher.fullName,
          email: teacher.email,
        },
      };
    }
  }

  if (seniorTeacherId && mongoose.Types.ObjectId.isValid(seniorTeacherId)) {
    const seniorTeacher = await SeniorTeacher.findById(seniorTeacherId).select("fullName email");
    if (seniorTeacher) {
      return {
        ok: true,
        user: {
          id: seniorTeacher._id.toString(),
          role: "senior-teacher",
          name: seniorTeacher.fullName,
          email: seniorTeacher.email,
        },
      };
    }
  }

  return {
    ok: false,
    response: NextResponse.json(
      {
        success: false,
        error:
          "Not authenticated for chat. Sign in as a student, teacher, senior teacher, or admin and try again.",
      },
      { status: 401 },
    ),
  };
}

export async function resolveChatUserById(id: string): Promise<ChatUser | null> {
  if (id === ADMIN_USER.id) return ADMIN_USER;
  if (id === SUPER_ADMIN_USER.id) return SUPER_ADMIN_USER;

  await dbConnect();

  if (mongoose.Types.ObjectId.isValid(id)) {
    const [student, teacher, seniorTeacher] = await Promise.all([
      Student.findById(id).select("fullName email"),
      Teacher.findById(id).select("fullName email"),
      SeniorTeacher.findById(id).select("fullName email"),
    ]);

    if (student) {
      return {
        id: student._id.toString(),
        role: "student",
        name: student.fullName,
        email: student.email ?? undefined,
      };
    }
    if (teacher) {
      return {
        id: teacher._id.toString(),
        role: "teacher",
        name: teacher.fullName,
        email: teacher.email,
      };
    }
    if (seniorTeacher) {
      return {
        id: seniorTeacher._id.toString(),
        role: "senior-teacher",
        name: seniorTeacher.fullName,
        email: seniorTeacher.email,
      };
    }
  }

  return null;
}

export async function isBlockedBetween(userId: string, otherId: string): Promise<boolean> {
  if (!userId || !otherId) return false;
  return !!(await ChatBlockedUser.findOne({
    $or: [
      { userId, blockedUserId: otherId },
      { userId: otherId, blockedUserId: userId },
    ],
  }));
}

export async function canUsersChat(user: ChatUser, other: ChatUser): Promise<boolean> {
  if (user.id === other.id) return false;
  if (await isBlockedBetween(user.id, other.id)) return false;

  if (user.role === "super-admin" || user.role === "admin") {
    return true;
  }

  if (user.role === "student") {
    return other.role === "teacher" || other.role === "senior-teacher";
  }

  if (user.role === "teacher") {
    return (
      other.role === "student" ||
      other.role === "senior-teacher" ||
      other.role === "admin" ||
      other.role === "super-admin"
    );
  }

  if (user.role === "senior-teacher") {
    return (
      other.role === "student" ||
      other.role === "teacher" ||
      other.role === "admin" ||
      other.role === "super-admin"
    );
  }

  return false;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function searchChatUsers(currentUser: ChatUser, query: string): Promise<ChatUser[]> {
  await dbConnect();
  const trimmed = query.trim();
  const regex = trimmed ? new RegExp(escapeRegex(trimmed), "i") : undefined;
  const results: ChatUser[] = [];
  const includeStudents =
    currentUser.role === "teacher" ||
    currentUser.role === "senior-teacher" ||
    currentUser.role === "admin" ||
    currentUser.role === "super-admin";
  const includeTeachers =
    currentUser.role === "student" ||
    currentUser.role === "senior-teacher" ||
    currentUser.role === "admin" ||
    currentUser.role === "super-admin";
  const includeSeniorTeachers =
    currentUser.role === "student" ||
    currentUser.role === "teacher" ||
    currentUser.role === "admin" ||
    currentUser.role === "super-admin";
  const includeAdmin =
    currentUser.role === "teacher" ||
    currentUser.role === "senior-teacher" ||
    currentUser.role === "admin" ||
    currentUser.role === "super-admin";
  const includeSuperAdmin = currentUser.role === "admin" || currentUser.role === "super-admin";

  const queryFilter = trimmed
    ? {
        $or: [{ fullName: regex }, { email: regex }],
      }
    : {};

  if (includeStudents) {
    const students = await Student.find(queryFilter)
      .select("fullName email")
      .limit(20)
      .lean();
    for (const student of students) {
      if (student._id.toString() === currentUser.id) continue;
      if (await isBlockedBetween(currentUser.id, student._id.toString())) continue;
      results.push({
        id: student._id.toString(),
        role: "student",
        name: student.fullName,
        email: student.email ?? undefined,
      });
    }
  }

  if (includeTeachers) {
    const teachers = await Teacher.find(queryFilter)
      .select("fullName email")
      .limit(20)
      .lean();
    for (const teacher of teachers) {
      if (teacher._id.toString() === currentUser.id) continue;
      if (await isBlockedBetween(currentUser.id, teacher._id.toString())) continue;
      results.push({
        id: teacher._id.toString(),
        role: "teacher",
        name: teacher.fullName,
        email: teacher.email,
      });
    }
  }

  if (includeSeniorTeachers) {
    const seniorTeachers = await SeniorTeacher.find(queryFilter)
      .select("fullName email")
      .limit(20)
      .lean();
    for (const seniorTeacher of seniorTeachers) {
      if (seniorTeacher._id.toString() === currentUser.id) continue;
      if (await isBlockedBetween(currentUser.id, seniorTeacher._id.toString())) continue;
      results.push({
        id: seniorTeacher._id.toString(),
        role: "senior-teacher",
        name: seniorTeacher.fullName,
        email: seniorTeacher.email,
      });
    }
  }

  if (includeAdmin) {
    if (ADMIN_USER.id !== currentUser.id && !(await isBlockedBetween(currentUser.id, ADMIN_USER.id))) {
      if (!trimmed || ADMIN_USER.name.match(regex!) || ADMIN_USER.email?.match(regex!)) {
        results.push(ADMIN_USER);
      }
    }
  }

  if (includeSuperAdmin) {
    if (SUPER_ADMIN_USER.id !== currentUser.id && !(await isBlockedBetween(currentUser.id, SUPER_ADMIN_USER.id))) {
      if (!trimmed || SUPER_ADMIN_USER.name.match(regex!) || SUPER_ADMIN_USER.email?.match(regex!)) {
        results.push(SUPER_ADMIN_USER);
      }
    }
  }

  return results.slice(0, 40);
}
