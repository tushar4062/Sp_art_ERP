import type { CredentialDocument } from "@/lib/models/Credentials";
import Credential from "@/lib/models/Credentials";
import SeniorTeacher from "@/lib/models/SeniorTeacher";
import Teacher from "@/lib/models/Teacher";
import { normalizeEmail } from "@/lib/auth/normalizeEmail";

/** Find credential by email (normalized + legacy case-insensitive fallback). */
export async function findCredentialByEmail(email: string): Promise<CredentialDocument | null> {
  const norm = normalizeEmail(email);
  const byNorm = await Credential.findOne({ email: norm });
  if (byNorm) return byNorm;

  const esc = norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Credential.findOne({ email: { $regex: new RegExp(`^${esc}$`, "i") } });
}

/** Find credential by email or username (login identifier). */
export async function findCredentialByLogin(identifier: string): Promise<CredentialDocument | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (trimmed.includes("@")) {
    return findCredentialByEmail(trimmed);
  }

  const username = trimmed.toLowerCase();
  const byUsername = await Credential.findOne({ username });
  if (byUsername) return byUsername;

  const esc = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const byUsernameCi = await Credential.findOne({
    username: { $regex: new RegExp(`^${esc}$`, "i") },
  });
  if (byUsernameCi) return byUsernameCi;

  const badgeEsc = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const badgeRegex = { $regex: new RegExp(`^${badgeEsc}$`, "i") };
  const senior = await SeniorTeacher.findOne({ badgeId: badgeRegex });
  if (senior?.email) {
    return findCredentialByEmail(senior.email);
  }

  const teacher = await Teacher.findOne({ badgeId: badgeRegex });
  if (teacher?.email) {
    return findCredentialByEmail(teacher.email);
  }

  return null;
}
