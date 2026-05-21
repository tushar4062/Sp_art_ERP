import mongoose from "mongoose";

const PAGE_SIZE = 10;

export { PAGE_SIZE };

export function applyExperienceFilter(filter: Record<string, unknown>, experience: string) {
  if (!experience || experience === "All") return;
  if (experience === "0-2") filter.experience = { $gte: 0, $lte: 2 };
  else if (experience === "3-5") filter.experience = { $gte: 3, $lte: 5 };
  else if (experience === "6+") filter.experience = { $gte: 6 };
  else {
    const years = parseInt(experience, 10);
    if (!Number.isNaN(years)) filter.experience = years;
  }
}

/** Ownership: assigned to this senior teacher OR legacy row without createdBy. */
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

export function buildSeniorTeacherTeachersFilter(
  seniorTeacherId: string,
  params: {
    search?: string;
    status?: string;
    subject?: string;
    specialization?: string;
    gender?: string;
    experience?: string;
  },
) {
  const andClauses: Record<string, unknown>[] = [
    { isSenior: { $ne: true } },
    ownershipClause(seniorTeacherId),
  ];

  if (params.status && params.status !== "All") andClauses.push({ status: params.status });
  if (params.subject && params.subject !== "All") andClauses.push({ currentSubjectCourse: params.subject });
  if (params.specialization && params.specialization !== "All") andClauses.push({ specialization: params.specialization });
  if (params.gender && params.gender !== "All") andClauses.push({ gender: params.gender });

  const experienceFilter: Record<string, unknown> = {};
  applyExperienceFilter(experienceFilter, params.experience ?? "All");
  if (Object.keys(experienceFilter).length) andClauses.push(experienceFilter);

  const search = params.search?.trim();
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    andClauses.push({
      $or: [
        { fullName: regex },
        { email: regex },
        { specialization: regex },
        { currentSubjectCourse: regex },
      ],
    });
  }

  return { $and: andClauses };
}

export function singleTeacherScope(teacherId: string, seniorTeacherId: string) {
  return {
    _id: new mongoose.Types.ObjectId(teacherId),
    isSenior: { $ne: true },
    ...ownershipClause(seniorTeacherId),
  };
}
