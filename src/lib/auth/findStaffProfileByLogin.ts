import Teacher from "@/lib/models/Teacher";
import SeniorTeacher from "@/lib/models/SeniorTeacher";
import { normalizeEmail } from "@/lib/auth/normalizeEmail";

function emailRegex(emailNorm: string) {
  const esc = emailNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { $regex: new RegExp(`^${esc}$`, "i") };
}

function badgeRegex(badgeId: string) {
  const esc = badgeId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { $regex: new RegExp(`^${esc}$`, "i") };
}

export type StaffProfileHit =
  | { role: "teacher"; id: string; fullName: string; email: string; phone?: string }
  | { role: "senior_teacher"; id: string; fullName: string; email: string; phone?: string };

/** Resolve teacher or senior teacher profile from login identifier (email, username local-part, badge, phone). */
export async function findStaffProfileByLogin(
  identifier: string,
  expectedRole: "teacher" | "senior_teacher",
): Promise<StaffProfileHit | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (expectedRole === "senior_teacher") {
    if (trimmed.includes("@")) {
      const senior = await SeniorTeacher.findOne({ email: emailRegex(normalizeEmail(trimmed)) });
      if (senior) {
        return {
          role: "senior_teacher",
          id: senior._id.toString(),
          fullName: senior.fullName,
          email: normalizeEmail(senior.email),
          phone: senior.phone,
        };
      }
      return null;
    }

    const byBadge = await SeniorTeacher.findOne({ badgeId: badgeRegex(trimmed) });
    if (byBadge) {
      return {
        role: "senior_teacher",
        id: byBadge._id.toString(),
        fullName: byBadge.fullName,
        email: normalizeEmail(byBadge.email),
        phone: byBadge.phone,
      };
    }

    const digits = trimmed.replace(/\D/g, "");
    if (digits.length >= 8) {
      const byPhone = await SeniorTeacher.findOne({
        phone: { $regex: new RegExp(digits.slice(-10).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) },
      });
      if (byPhone) {
        return {
          role: "senior_teacher",
          id: byPhone._id.toString(),
          fullName: byPhone.fullName,
          email: normalizeEmail(byPhone.email),
          phone: byPhone.phone,
        };
      }
    }

    return null;
  }

  if (trimmed.includes("@")) {
    const teacher = await Teacher.findOne({ email: emailRegex(normalizeEmail(trimmed)) });
    if (teacher) {
      return {
        role: "teacher",
        id: teacher._id.toString(),
        fullName: teacher.fullName,
        email: normalizeEmail(teacher.email),
        phone: teacher.phone,
      };
    }
    return null;
  }

  const byBadge = await Teacher.findOne({ badgeId: badgeRegex(trimmed) });
  if (byBadge) {
    return {
      role: "teacher",
      id: byBadge._id.toString(),
      fullName: byBadge.fullName,
      email: normalizeEmail(byBadge.email),
      phone: byBadge.phone,
    };
  }

  return null;
}
