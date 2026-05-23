import bcrypt from "bcryptjs";
import Credential from "@/lib/models/Credentials";
import { findCredentialByEmail } from "@/lib/auth/findCredential";
import { normalizeEmail } from "@/lib/auth/normalizeEmail";
import { generateCompliantPassword } from "@/lib/auth/generateCompliantPassword";
import { sendAccountCreationEmail } from "@/lib/sendEmail";
import type { CredentialAccountStatus } from "@/lib/models/Credentials";

export type EnsureTeacherCredentialResult =
  | { created: false; credentialId: string }
  | { created: true; credentialId: string; password: string; emailSent: boolean; emailError: string | null };

export async function ensureTeacherCredential(input: {
  name: string;
  email: string;
  mobileNumber?: string;
  accountStatus?: CredentialAccountStatus;
  createdBy?: string;
  password?: string;
}): Promise<EnsureTeacherCredentialResult> {
  const emailNorm = normalizeEmail(input.email);
  const existing = await findCredentialByEmail(emailNorm);
  if (existing) {
    if (existing.role !== "teacher") {
      existing.role = "teacher";
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
    role: "teacher",
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
    console.error("[ensureTeacherCredential] welcome email failed", error);
  }

  return {
    created: true,
    credentialId: credential._id.toString(),
    password,
    emailSent,
    emailError,
  };
}
