/** Simple HTTP-only session cookies (MongoDB document id only — no JWT). */

export const STUDENT_SESSION_COOKIE = "student_session";
export const TEACHER_SESSION_COOKIE = "teacher_session";
export const SENIOR_TEACHER_SESSION_COOKIE = "senior_teacher_session";

const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export function portalSessionCookieOptions(maxAge = MAX_AGE_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function clearSessionCookieOptions() {
  return portalSessionCookieOptions(0);
}
