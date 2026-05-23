import type { CredentialDocument } from "@/lib/models/Credentials";
import Credential from "@/lib/models/Credentials";
import { findCredentialByEmail, findCredentialByLogin } from "@/lib/auth/findCredential";
import { findStaffProfileByLogin } from "@/lib/auth/findStaffProfileByLogin";
import { ensureSeniorTeacherCredential } from "@/lib/auth/ensureSeniorTeacherCredential";
import { ensureTeacherCredential } from "@/lib/auth/ensureTeacherCredential";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * When staff profile exists but no credential (common for Senior Teachers added under
 * Admin → Senior Teachers only), create credential using the password from login.
 */
export async function provisionStaffLoginCredential(
  expectedRole: "teacher" | "senior_teacher",
  loginId: string,
  password: string,
): Promise<CredentialDocument | null> {
  if (!PASSWORD_REGEX.test(password)) return null;

  const profile = await findStaffProfileByLogin(loginId, expectedRole);
  if (!profile) return null;

  const existing = await findCredentialByEmail(profile.email);
  if (existing) {
    return Credential.findById(existing._id);
  }

  if (expectedRole === "senior_teacher") {
    await ensureSeniorTeacherCredential({
      name: profile.fullName,
      email: profile.email,
      mobileNumber: profile.phone,
      password,
      createdBy: "first-login",
    });
  } else {
    await ensureTeacherCredential({
      name: profile.fullName,
      email: profile.email,
      mobileNumber: profile.phone,
      password,
      createdBy: "first-login",
    });
  }

  return findCredentialByLogin(loginId.includes("@") ? profile.email : loginId);
}
