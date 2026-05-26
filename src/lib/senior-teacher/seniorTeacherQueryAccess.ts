import type { QueryDocument } from "@/lib/models/Query";
import {
  getProfileEditAccess,
  normalizeQueryFields,
} from "@/lib/queries/queryAccess";

export type SeniorTeacherQueryDto = {
  id: string;
  seniorTeacherName: string;
  seniorTeacherEmail: string;
  remarks: string;
  status: string;
  adminRemark: string;
  createdAt: string;
  updatedAt: string;
};

export function serializeSeniorTeacherQuery(
  doc: QueryDocument | Record<string, unknown>,
): SeniorTeacherQueryDto {
  const n = normalizeQueryFields(doc as Record<string, unknown> & { _id: { toString(): string } });
  return {
    id: n.id,
    seniorTeacherName: n.personName,
    seniorTeacherEmail: n.personEmail,
    remarks: n.remarks,
    status: n.status,
    adminRemark: n.adminRemark,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

export async function getSeniorTeacherProfileEditAccess(seniorTeacherId: string) {
  const access = await getProfileEditAccess("senior_teacher", seniorTeacherId);
  return {
    canEditProfile: access.canEditProfile,
    latestQuery: access.latestQuery
      ? ({
          id: access.latestQuery.id,
          seniorTeacherName: access.latestQuery.personName,
          seniorTeacherEmail: access.latestQuery.personEmail,
          remarks: access.latestQuery.remarks,
          status: access.latestQuery.status,
          adminRemark: access.latestQuery.adminRemark,
          createdAt: access.latestQuery.createdAt,
          updatedAt: access.latestQuery.updatedAt,
        } satisfies SeniorTeacherQueryDto)
      : null,
  };
}
