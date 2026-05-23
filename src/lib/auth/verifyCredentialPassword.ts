import bcrypt from "bcryptjs";
import type { CredentialDocument } from "@/lib/models/Credentials";

/**
 * Verify password against bcrypt hash; fall back to legacy plaintext `password` field
 * and re-hash when plain text matches.
 */
export async function verifyCredentialPassword(
  credential: CredentialDocument,
  password: string,
): Promise<boolean> {
  const plain = String(password).trim();
  if (!plain) return false;

  const hash = credential.passwordHash?.trim();
  if (hash && hash.length > 10) {
    try {
      if (await bcrypt.compare(plain, hash)) return true;
    } catch {
      // Corrupt hash — try legacy plain password below
    }
  }

  const legacy = credential.password?.trim();
  if (legacy && legacy === plain) {
    credential.passwordHash = await bcrypt.hash(plain, 12);
    await credential.save();
    return true;
  }

  return false;
}
