/** Re-export — all admin/student query data lives in MongoDB collection `queries`. */
export { default } from "@/lib/models/Query";
export type { QueryDocument as StudentQueryDocument, QueryStatus as StudentQueryStatus } from "@/lib/models/Query";
