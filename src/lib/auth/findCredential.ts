import type { CredentialDocument } from "@/lib/models/Credentials";
import Credential from "@/lib/models/Credentials";
import { normalizeEmail } from "@/lib/auth/normalizeEmail";

/** Find credential by email (normalized + legacy case-insensitive fallback). */
export async function findCredentialByEmail(email: string): Promise<CredentialDocument | null> {
  const norm = normalizeEmail(email);
  const byNorm = await Credential.findOne({ email: norm });
  if (byNorm) return byNorm;

  const esc = norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Credential.findOne({ email: { $regex: new RegExp(`^${esc}$`, "i") } });
}
