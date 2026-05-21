import Student from "@/lib/models/Student";

/** Map student email (lowercase) → photo URL from main students collection. */
export async function loadPhotosByEmail(emails: string[]): Promise<Record<string, string>> {
  const normalized = emails.map(e => e?.trim().toLowerCase()).filter(Boolean);
  if (!normalized.length) return {};

  const rows = await Student.find({ email: { $in: normalized } })
    .select("email photo")
    .lean();

  const map: Record<string, string> = {};
  for (const row of rows) {
    const key = (row.email as string | undefined)?.trim().toLowerCase();
    if (key && row.photo) map[key] = row.photo as string;
  }
  return map;
}
