import { parseJsonResponse } from "@/lib/api/parseJsonResponse";

export type LeaveSubmitPayload = {
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
};

export type LeaveSubmitResult =
  | { ok: true; message: string }
  | { ok: false; kind: "duplicate" | "auth" | "validation" | "error"; message: string };

function leaveSubmitKey(apiPath: string, payload: LeaveSubmitPayload): string {
  return [
    apiPath,
    payload.leaveType,
    payload.fromDate,
    payload.toDate,
    payload.reason.trim(),
  ].join("|");
}

/** Only one POST per API path at a time (blocks parallel automatic/duplicate calls). */
const postLocks = new Map<string, Promise<LeaveSubmitResult>>();

/** One in-flight POST per identical payload. */
const inflightSubmits = new Map<string, Promise<LeaveSubmitResult>>();

async function executeLeaveSubmit(
  apiPath: string,
  payload: LeaveSubmitPayload,
): Promise<LeaveSubmitResult> {
  const res = await fetch(apiPath, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await parseJsonResponse<{
    error?: string;
    message?: string;
    code?: string;
  }>(res);

  if (res.status === 401) {
    return { ok: false, kind: "auth", message: json.error || "Unauthorized" };
  }

  if (res.status === 409 || json.code === "DUPLICATE_LEAVE") {
    return {
      ok: false,
      kind: "duplicate",
      message: json.error || "Leave request already exists",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      kind: res.status === 400 ? "validation" : "error",
      message: json.error || "Something went wrong",
    };
  }

  return {
    ok: true,
    message: json.message || "Leave request submitted successfully",
  };
}

export async function submitLeaveRequest(
  apiPath: string,
  payload: LeaveSubmitPayload,
): Promise<LeaveSubmitResult> {
  const pathLockKey = `POST:${apiPath}`;
  const existingPathLock = postLocks.get(pathLockKey);
  if (existingPathLock) return existingPathLock;

  const payloadKey = leaveSubmitKey(apiPath, payload);
  const existingPayload = inflightSubmits.get(payloadKey);
  if (existingPayload) return existingPayload;

  const promise = executeLeaveSubmit(apiPath, payload).finally(() => {
    inflightSubmits.delete(payloadKey);
    postLocks.delete(pathLockKey);
  });

  inflightSubmits.set(payloadKey, promise);
  postLocks.set(pathLockKey, promise);
  return promise;
}
