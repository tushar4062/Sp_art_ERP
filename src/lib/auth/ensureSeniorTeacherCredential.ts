import bcrypt from "bcryptjs";
import Credential from "@/lib/models/Credentials";
import type { CredentialAccountStatus } from "@/lib/models/Credentials";
import { findCredentialByEmail } from "@/lib/auth/findCredential";
import { normalizeEmail } from "@/lib/auth/normalizeEmail";
import { generateCompliantPassword } from "@/lib/auth/generateCompliantPassword";
import { sendAccountCreationEmail } from "@/lib/sendEmail";

export type EnsureSeniorCredentialResult =
  | { created: false; credentialId: string }
  | { created: true; credentialId: string; password: string; emailSent: boolean; emailError: string | null };

/**
 * Ensures a senior_teacher credential exists for portal login.
 * Used when admin adds a senior under Senior Teachers (profile-only flow).
 */
export async function ensureSeniorTeacherCredential(input: {
  name: string;
  email: string;
  mobileNumber?: string;
  accountStatus?: CredentialAccountStatus;
  createdBy?: string;
  password?: string;
}): Promise<EnsureSeniorCredentialResult> {
  const emailNorm = normalizeEmail(input.email);
  const existing = await findCredentialByEmail(emailNorm);
  if (existing) {
    if (existing.role !== "senior_teacher") {
      existing.role = "senior_teacher";
      await existing.save();
    }
    if (input.accountStatus && existing.accountStatus !== input.accountStatus) {
      existing.accountStatus = input.accountStatus;
      await existing.save();
    }
    if (input.password?.trim()) {
      existing.password = input.password;
      existing.passwordHash = await bcrypt.hash(input.password, 12);
      await existing.save();
    }
    return { created: false, credentialId: existing._id.toString() };
  }

  const password = input.password?.trim() || generateCompliantPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const username = emailNorm.split("@")[0];
  let uniqueUsername = username;
  let suffix = 1;
  while (await Credential.findOne({ username: uniqueUsername })) {
    uniqueUsername = `${username}${suffix}`;
    suffix += 1;
  }

  const credential = await Credential.create({
    name: input.name,
    username: uniqueUsername,
    email: emailNorm,
    password,
    passwordHash,
    role: "senior_teacher",
    accountStatus: input.accountStatus ?? "Active",
    mobileNumber: input.mobileNumber,
    createdBy: input.createdBy ?? "Admin",
  });

  const loginUrl = process.env.NEXT_PUBLIC_LOGIN_URL ?? "http://localhost:3000/login";
  let emailSent = true;
  let emailError: string | null = null;

  try {
    await sendAccountCreationEmail({
      to: emailNorm,
      name: input.name,
      email: emailNorm,
      password,
      loginUrl,
    });
  } catch (error) {
    emailSent = false;
    emailError = error instanceof Error ? error.message : "Email send failed";
    console.error("[ensureSeniorTeacherCredential] welcome email failed", error);
  }

  return {
    created: true,
    credentialId: credential._id.toString(),
    password,
    emailSent,
    emailError,
  };
}
