import mongoose from "mongoose";
import Query, { type QueryDocument, type QueryRole } from "@/lib/models/Query";

export type { QueryRole };
export type QueryRoleType = QueryRole;

export type NormalizedQuery = {
  id: string;
  role: QueryRole;
  userId: string;
  personName: string;
  personEmail: string;
  remarks: string;
  status: string;
  adminRemark: string;
  createdAt: string;
  updatedAt: string;
};

export type UnifiedAdminQuery = {
  id: string;
  roleType: QueryRole;
  personName: string;
  personEmail: string;
  remarks: string;
  status: string;
  adminRemark: string;
  createdAt: string;
  updatedAt: string;
};

type RawQuery = Record<string, unknown> & {
  _id: mongoose.Types.ObjectId | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

function toRawQuery(doc: QueryDocument | RawQuery | Record<string, unknown>): RawQuery {
  if (doc && typeof (doc as QueryDocument).toObject === "function") {
    return (doc as QueryDocument).toObject() as RawQuery;
  }
  return doc as RawQuery;
}

/** Resolve unified fields from new or legacy document shape. */
export function normalizeQueryFields(doc: QueryDocument | RawQuery | Record<string, unknown>): NormalizedQuery {
  const d = toRawQuery(doc);
  const id = d._id.toString();

  if (d.role && d.userId) {
    return {
      id,
      role: d.role as QueryRole,
      userId: String(d.userId),
      personName: String(d.personName ?? ""),
      personEmail: String(d.personEmail ?? ""),
      remarks: String(d.remarks ?? ""),
      status: String(d.status ?? "pending"),
      adminRemark: String(d.adminRemark ?? ""),
      createdAt: new Date(d.createdAt as Date).toISOString(),
      updatedAt: new Date(d.updatedAt as Date).toISOString(),
    };
  }

  if (d.studentId || d.studentName) {
    return {
      id,
      role: "student",
      userId: String(d.userId ?? d.studentId),
      personName: String(d.personName ?? d.studentName ?? ""),
      personEmail: String(d.personEmail ?? d.studentEmail ?? ""),
      remarks: String(d.remarks ?? ""),
      status: String(d.status ?? "pending"),
      adminRemark: String(d.adminRemark ?? ""),
      createdAt: new Date(d.createdAt as Date).toISOString(),
      updatedAt: new Date(d.updatedAt as Date).toISOString(),
    };
  }

  if (d.teacherId || d.teacherName) {
    return {
      id,
      role: "teacher",
      userId: String(d.userId ?? d.teacherId),
      personName: String(d.personName ?? d.teacherName ?? ""),
      personEmail: String(d.personEmail ?? d.teacherEmail ?? ""),
      remarks: String(d.remarks ?? ""),
      status: String(d.status ?? "pending"),
      adminRemark: String(d.adminRemark ?? ""),
      createdAt: new Date(d.createdAt as Date).toISOString(),
      updatedAt: new Date(d.updatedAt as Date).toISOString(),
    };
  }

  return {
    id,
    role: "senior_teacher",
    userId: String(d.userId ?? d.seniorTeacherId),
    personName: String(d.personName ?? d.seniorTeacherName ?? ""),
    personEmail: String(d.personEmail ?? d.seniorTeacherEmail ?? ""),
    remarks: String(d.remarks ?? ""),
    status: String(d.status ?? "pending"),
    adminRemark: String(d.adminRemark ?? ""),
    createdAt: new Date(d.createdAt as Date).toISOString(),
    updatedAt: new Date(d.updatedAt as Date).toISOString(),
  };
}

export function toUnifiedAdminQuery(
  doc: QueryDocument | RawQuery | Record<string, unknown>,
): UnifiedAdminQuery {
  const n = normalizeQueryFields(doc);
  return {
    id: n.id,
    roleType: n.role,
    personName: n.personName,
    personEmail: n.personEmail,
    remarks: n.remarks,
    status: n.status,
    adminRemark: n.adminRemark,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

/** Copy legacy `student_queries` into `queries` if needed. */
export async function migrateLegacyStudentQueriesCollection(): Promise<number> {
  const db = mongoose.connection.db;
  if (!db) return 0;

  const queriesCount = await db.collection("queries").countDocuments();
  if (queriesCount > 0) return 0;

  const legacy = await db.collection("student_queries").find({}).toArray();
  if (!legacy.length) return 0;

  await db.collection("queries").insertMany(
    legacy.map(doc => {
      const { _id, ...rest } = doc;
      return { ...rest, _id };
    }),
  );
  return legacy.length;
}

async function normalizeLegacyDocsInQueries(): Promise<number> {
  const cursor = Query.find({
    $or: [{ role: { $exists: false } }, { role: null }, { userId: { $exists: false } }],
  }).cursor();

  let count = 0;
  for await (const doc of cursor) {
    const n = normalizeQueryFields(doc);
    doc.role = n.role;
    doc.userId = new mongoose.Types.ObjectId(n.userId);
    doc.personName = n.personName;
    doc.personEmail = n.personEmail;
    await doc.save();
    count++;
  }
  return count;
}

async function importLegacyCollection(
  collectionName: string,
  role: QueryRole,
  mapDoc: (doc: Record<string, unknown>) => Record<string, unknown>,
): Promise<number> {
  const db = mongoose.connection.db;
  if (!db) return 0;

  const legacy = await db.collection(collectionName).find({}).toArray();
  if (!legacy.length) return 0;

  let imported = 0;
  for (const raw of legacy) {
    const id = raw._id as mongoose.Types.ObjectId;
    const exists = await Query.findById(id).lean();
    if (exists) continue;

    const payload = mapDoc(raw as Record<string, unknown>);
    try {
      await Query.collection.insertOne({
        ...payload,
        _id: id,
      });
      imported++;
    } catch (e) {
      const code = (e as { code?: number }).code;
      if (code !== 11000) throw e;
    }
  }
  return imported;
}

/**
 * One-time migrations: student_queries → queries, normalize student docs,
 * teacher_queries & senior_teacher_queries → queries with role.
 */
export async function migrateAllQueriesCollections(): Promise<void> {
  await migrateLegacyStudentQueriesCollection();
  await normalizeLegacyDocsInQueries();

  await importLegacyCollection("teacher_queries", "teacher", doc => ({
    role: "teacher",
    userId: doc.teacherId,
    personName: doc.teacherName,
    personEmail: doc.teacherEmail,
    remarks: doc.remarks,
    status: doc.status ?? "pending",
    adminRemark: doc.adminRemark ?? "",
    reviewedAt: doc.reviewedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }));

  await importLegacyCollection("senior_teacher_queries", "senior_teacher", doc => ({
    role: "senior_teacher",
    userId: doc.seniorTeacherId,
    personName: doc.seniorTeacherName,
    personEmail: doc.seniorTeacherEmail,
    remarks: doc.remarks,
    status: doc.status ?? "pending",
    adminRemark: doc.adminRemark ?? "",
    reviewedAt: doc.reviewedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }));
}

export async function getProfileEditAccess(role: QueryRole, userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { canEditProfile: false, latestQuery: null as NormalizedQuery | null };
  }

  await migrateAllQueriesCollections();

  const latest = await Query.findOne({
    role,
    userId: new mongoose.Types.ObjectId(userId),
  })
    .sort({ createdAt: -1 })
    .lean();

  return {
    canEditProfile: latest?.status === "approved",
    latestQuery: latest ? normalizeQueryFields(latest) : null,
  };
}

export async function fetchAllAdminQueries(filters: {
  search: string;
  status: string;
  roleType: string;
}): Promise<UnifiedAdminQuery[]> {
  await migrateAllQueriesCollections();

  const dbFilter: Record<string, unknown> = {};
  if (filters.status && filters.status !== "all") {
    dbFilter.status = filters.status;
  }
  if (filters.roleType && filters.roleType !== "all") {
    dbFilter.role = filters.roleType;
  }

  const rows = await Query.find(dbFilter).sort({ createdAt: -1 }).lean();
  let result = rows.map(r => toUnifiedAdminQuery(r));

  if (filters.search) {
    const s = filters.search;
    result = result.filter(
      q =>
        q.personName.toLowerCase().includes(s) ||
        q.personEmail.toLowerCase().includes(s) ||
        q.remarks.toLowerCase().includes(s),
    );
  }

  return result;
}

export async function findQueryByIdAndRole(id: string, role: QueryRole) {
  await migrateAllQueriesCollections();
  const doc = await Query.findById(id);
  if (!doc) return null;
  if (normalizeQueryFields(doc).role !== role) return null;
  return doc;
}
