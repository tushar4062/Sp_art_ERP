import type { QueryDocument } from "@/lib/models/Query";
import {
  getProfileEditAccess,
  normalizeQueryFields,
} from "@/lib/queries/queryAccess";

export type TeacherQueryDto = {
  id: string;
  teacherName: string;
  teacherEmail: string;
  remarks: string;
  status: string;
  adminRemark: string;
  createdAt: string;
  updatedAt: string;
};

export function serializeTeacherQuery(doc: QueryDocument | Record<string, unknown>): TeacherQueryDto {
  const n = normalizeQueryFields(doc as Record<string, unknown> & { _id: { toString(): string } });
  return {
    id: n.id,
    teacherName: n.personName,
    teacherEmail: n.personEmail,
    remarks: n.remarks,
    status: n.status,
    adminRemark: n.adminRemark,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

export async function getTeacherProfileEditAccess(teacherId: string) {
  const access = await getProfileEditAccess("teacher", teacherId);
  return {
    canEditProfile: access.canEditProfile,
    latestQuery: access.latestQuery
      ? ({
          id: access.latestQuery.id,
          teacherName: access.latestQuery.personName,
          teacherEmail: access.latestQuery.personEmail,
          remarks: access.latestQuery.remarks,
          status: access.latestQuery.status,
          adminRemark: access.latestQuery.adminRemark,
          createdAt: access.latestQuery.createdAt,
          updatedAt: access.latestQuery.updatedAt,
        } satisfies TeacherQueryDto)
      : null,
  };
}

export type TeacherQueryListFilters = {
  search: string;
  status: string;
};

export function applyTeacherQueryFilters(
  items: TeacherQueryDto[],
  filters: TeacherQueryListFilters,
): TeacherQueryDto[] {
  return items.filter(q => {
    if (filters.search) {
      const s = filters.search;
      if (
        !q.teacherName.toLowerCase().includes(s) &&
        !q.teacherEmail.toLowerCase().includes(s) &&
        !q.remarks.toLowerCase().includes(s)
      ) {
        return false;
      }
    }
    if (filters.status && filters.status !== "all" && q.status !== filters.status) {
      return false;
    }
    return true;
  });
}
