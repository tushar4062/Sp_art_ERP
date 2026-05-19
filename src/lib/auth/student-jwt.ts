import { SignJWT, jwtVerify } from "jose";

export const STUDENT_COOKIE = "student_token";
const ISSUER = "little-brushes-portal";
const AUDIENCE = "student";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export type StudentTokenPayload = {
  id: string;
  email: string;
  role: "student";
};

function getSecret() {
  const key = process.env.JWT_SECRET;
  if (!key || key.length < 16) {
    throw new Error("JWT_SECRET must be set in .env (min 16 characters)");
  }
  return new TextEncoder().encode(key);
}

export async function signStudentToken(payload: StudentTokenPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(getSecret());
}

export async function verifyStudentToken(token: string): Promise<StudentTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (payload.role !== "student" || typeof payload.id !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return { id: payload.id, email: payload.email, role: "student" };
  } catch {
    return null;
  }
}

export function studentCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}
