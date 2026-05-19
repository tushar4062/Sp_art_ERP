import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, init?: { message?: string; status?: number }) {
  return NextResponse.json(
    { success: true, data, ...(init?.message ? { message: init.message } : {}) },
    { status: init?.status ?? 200 },
  );
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}
