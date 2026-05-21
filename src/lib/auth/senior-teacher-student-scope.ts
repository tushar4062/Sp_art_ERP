import mongoose from "mongoose";

export const STUDENT_PAGE_SIZE = 10;

/** Assigned to this senior teacher OR legacy row without createdBy. */
function ownershipClause(seniorTeacherId: string) {
  const seniorOid = new mongoose.Types.ObjectId(seniorTeacherId);
  return {
    $or: [
      { createdBy: seniorOid },
      { createdBy: { $exists: false } },
      { createdBy: null },
    ],
  };
}

export function buildSeniorTeacherStudentsFilter(
  seniorTeacherId: string,
  params: {
    search?: string;
    status?: string;
    className?: string;
    course?: string;
    gender?: string;
  },
) {
  const andClauses: Record<string, unknown>[] = [ownershipClause(seniorTeacherId)];

  if (params.status && params.status !== "All") {
    if (params.status === "Active") andClauses.push({ feeStatus: "Paid" });
    else andClauses.push({ feeStatus: { $in: ["Pending", "Overdue"] } });
  }
  if (params.className && params.className !== "All") andClauses.push({ className: params.className });
  if (params.course && params.course !== "All") andClauses.push({ currentCourse: params.course });
  if (params.gender && params.gender !== "All") andClauses.push({ gender: params.gender });

  const search = params.search?.trim();
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    andClauses.push({
      $or: [
        { fullName: regex },
        { email: regex },
        { className: regex },
        { currentCourse: regex },
        { parentName: regex },
        { fatherName: regex },
      ],
    });
  }

  return { $and: andClauses };
}

export function singleStudentScope(studentId: string, seniorTeacherId: string) {
  return {
    _id: new mongoose.Types.ObjectId(studentId),
    ...ownershipClause(seniorTeacherId),
  };
}
