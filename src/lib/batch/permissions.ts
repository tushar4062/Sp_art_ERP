import type { Role } from "@/data/mockData";

/** Admin and senior teacher can create, edit, and delete batches. */
export function canManageBatches(role: Role | string | undefined): boolean {
  return role === "admin" || role === "senior-teacher";
}
