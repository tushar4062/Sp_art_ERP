import type { QueryDocument } from "@/lib/models/Query";
import {
  getProfileEditAccess,
  migrateAllQueriesCollections,
  migrateLegacyStudentQueriesCollection,
  normalizeQueryFields,
  type NormalizedQuery,
} from "@/lib/queries/queryAccess";

export type StudentQueryDto = {
  id: string;
  studentName: string;
  studentEmail: string;
  remarks: string;
  status: string;
  adminRemark: string;
  createdAt: string;
  updatedAt: string;
};

export function serializeStudentQuery(doc: QueryDocument | Record<string, unknown>): StudentQueryDto {
  const n = normalizeQueryFields(doc as Record<string, unknown> & { _id: { toString(): string } });
  return {
    id: n.id,
    studentName: n.personName,
    studentEmail: n.personEmail,
    remarks: n.remarks,
    status: n.status,
    adminRemark: n.adminRemark,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

export async function getStudentProfileEditAccess(studentId: string) {
  const access = await getProfileEditAccess("student", studentId);
  return {
    canEditProfile: access.canEditProfile,
    latestQuery: access.latestQuery
      ? ({
          id: access.latestQuery.id,
          studentName: access.latestQuery.personName,
          studentEmail: access.latestQuery.personEmail,
          remarks: access.latestQuery.remarks,
          status: access.latestQuery.status,
          adminRemark: access.latestQuery.adminRemark,
          createdAt: access.latestQuery.createdAt,
          updatedAt: access.latestQuery.updatedAt,
        } satisfies StudentQueryDto)
      : null,
  };
}

export { migrateLegacyStudentQueriesCollection, migrateAllQueriesCollections };
export type { NormalizedQuery };
