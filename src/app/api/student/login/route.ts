import { NextRequest } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { apiError, apiSuccess } from "@/lib/api-response";
import {
  STUDENT_SESSION_COOKIE,
  portalSessionCookieOptions,
} from "@/lib/auth/portal-session";
import { authenticateStudentLogin, findStudentByEmail } from "@/lib/student-portal";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors.map(e => e.message).join("; "), 422);
    }

    const email = parsed.data.email.toLowerCase().trim();
    const { password } = parsed.data;

    await dbConnect();

    const existing = await findStudentByEmail(email);
    if (!existing) {
      return apiError(
        "No student found in the Students module. Ask admin to add your record first.",
        401,
      );
    }

    const student = await authenticateStudentLogin(email, password);
    if (!student) {
      return apiError("Invalid email or password", 401);
    }

    const response = apiSuccess({
      user: {
        name: student.fullName,
        email: student.email ?? email,
        role: "student",
      },
    });

    response.cookies.set(
      STUDENT_SESSION_COOKIE,
      student._id.toString(),
      portalSessionCookieOptions(),
    );
    return response;
  } catch (error) {
    console.error("[student/login]", error);
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("querySrv") ||
      message.includes("ECONNREFUSED") ||
      message.includes("MongoServerSelection") ||
      message.includes("whitelist")
    ) {
      return apiError(
        "Cannot reach MongoDB. Add your IP in Atlas Network Access, or set MONGODB_URI_DIRECT in .env (standard connection string from Atlas).",
        503,
      );
    }
    return apiError("Login failed", 500);
  }
}
