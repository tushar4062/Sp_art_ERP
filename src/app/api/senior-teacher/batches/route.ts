import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Batch, { type BatchDocument } from "@/lib/models/Batch";
import Teacher from "@/lib/models/Teacher";
import { getSeniorTeacherPortalAccess, requireBatchWrite } from "@/lib/auth/require-batch-access";
import { batchWriteSchema } from "@/lib/validators/batch";
import { buildTeacherAssignmentEmailHtml, sendTransactionalEmail } from "@/lib/email/mailer";
import { serializeBatch } from "@/lib/serializers/batchSerialize";
import { serializeTeacherAttendance } from "@/lib/serializers/teacherAttendanceSerialize";
import { applyBatchWriteToDocument, generateBatchCode } from "@/lib/batch/applyBatchFields";
import { syncTeacherAssignedBatches } from "@/lib/batch/syncTeacherBatches";
import { applySeniorOwnership, resolveBatchAssignees } from "@/lib/batch/resolveBatchAssignees";
import TeacherAttendance from "@/lib/models/TeacherAttendance";
import type { TeacherAttendanceDocument } from "@/lib/models/TeacherAttendance";
import { seniorBatchScopeFilter } from "@/lib/attendance/batchScope";
import { todayDateString } from "@/lib/dates/attendanceDate";

export const runtime = "nodejs";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 500;

function resolvePageSize(searchParams: URLSearchParams) {
  const requested = parseInt(searchParams.get("limit") || "", 10);
  if (Number.isFinite(requested) && requested > 0) {
    return Math.min(requested, MAX_PAGE_SIZE);
  }
  return DEFAULT_PAGE_SIZE;
}

async function notifyAssignedTeachers(batch: BatchDocument) {
  const warnings: string[] = [];
  const ids = batch.teacherIds ?? [];
  if (!ids.length) return warnings;

  const teachers = await Teacher.find({ _id: { $in: ids } }).lean();
  const batchTiming = batch.batchTiming || `${batch.batchDay} · ${batch.batchTime}`;
  const startDate = batch.startDate ?? batch.startMonth;

  for (const t of teachers) {
    const name = t.fullName || "Teacher";
    const html = buildTeacherAssignmentEmailHtml({
      teacherName: name,
      batchName: batch.batchName,
      course: batch.courseName,
      batchTiming,
      startDate,
      branch: batch.branch,
    });
    try {
      await sendTransactionalEmail({
        to: t.email,
        subject: "You Have Been Assigned to a New Batch",
        html,
        text: `Hi ${name}, you have been assigned to batch "${batch.batchName}" (${batch.courseName}). Schedule: ${batchTiming}. Start: ${startDate}. Branch: ${batch.branch}.`,
      });
    } catch (err) {
      console.error("[batch notify]", t.email, err);
      warnings.push(`Could not email ${name} (${t.email})`);
    }
  }
  return warnings;
}

function buildListFilter(
  access: { kind: string; seniorTeacherId?: string },
  params: { search: string; course: string; teacherId: string; status: string },
) {
  const andClauses: Record<string, unknown>[] = [];

  if (access.kind === "senior" && access.seniorTeacherId) {
    andClauses.push(seniorBatchScopeFilter(access.seniorTeacherId));
  }

  if (params.course && params.course !== "All") andClauses.push({ courseName: params.course });
  if (params.status && params.status !== "All") andClauses.push({ batchStatus: params.status });
  if (params.teacherId && params.teacherId !== "All" && mongoose.Types.ObjectId.isValid(params.teacherId)) {
    andClauses.push({ teacherIds: new mongoose.Types.ObjectId(params.teacherId) });
  }
  if (params.search) {
    const esc = params.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(esc, "i");
    andClauses.push({
      $or: [
        { batchName: rx },
        { batchCode: rx },
        { courseName: rx },
        { branch: rx },
        { roomNumber: rx },
        { description: rx },
      ],
    });
  }

  return andClauses.length ? { $and: andClauses } : {};
}

export async function GET(request: NextRequest) {
  try {
    const access = await getSeniorTeacherPortalAccess(request);
    if (!access) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (access.kind === "teacher") {
      return NextResponse.json({ success: false, error: "Use /api/teacher/batches" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = resolvePageSize(searchParams);
    const filter = buildListFilter(access, {
      search: (searchParams.get("search") || "").trim(),
      course: (searchParams.get("course") || "").trim(),
      teacherId: (searchParams.get("teacherId") || "").trim(),
      status: (searchParams.get("status") || "All").trim(),
    });

    const skip = (page - 1) * pageSize;
    const [total, rows] = await Promise.all([
      Batch.countDocuments(filter),
      Batch.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate("teacherIds", "fullName email"),
    ]);

    const batchIds = rows.map(d => d._id as mongoose.Types.ObjectId);
    const today = todayDateString();
    const seniorOid =
      access.kind === "senior" && access.seniorTeacherId
        ? new mongoose.Types.ObjectId(access.seniorTeacherId)
        : null;

    const todayRecords =
      seniorOid && batchIds.length
        ? await TeacherAttendance.find({
            role: "senior-teacher",
            teacherId: seniorOid,
            batchId: { $in: batchIds },
            attendanceDate: today,
          }).lean()
        : [];

    const attendanceByBatch = new Map(todayRecords.map(r => [r.batchId.toString(), r]));

    const emptyToday = {
      alreadyMarked: false,
      status: null as string | null,
      remarks: "",
      record: null,
    };

    const batches = rows.map(d => {
      const base = serializeBatch(d as BatchDocument);
      if (!seniorOid) {
        return { ...base, todayAttendance: emptyToday };
      }
      const rec = attendanceByBatch.get(base.id);
      return {
        ...base,
        todayAttendance: rec
          ? {
              alreadyMarked: true,
              status: rec.status,
              remarks: rec.remarks ?? "",
              record: serializeTeacherAttendance(rec as unknown as TeacherAttendanceDocument),
            }
          : emptyToday,
      };
    });

    const courseOptions = await Batch.distinct("courseName", filter);
    const teacherOptions = await Teacher.find({ isSenior: { $ne: true }, status: "Active" })
      .select("fullName")
      .sort({ fullName: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        batches,
        pagination: {
          page,
          limit: pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
        filterOptions: {
          courses: courseOptions.filter(Boolean).sort(),
          teachers: teacherOptions.map(t => ({ id: t._id.toString(), fullName: t.fullName })),
        },
      },
    });
  } catch (e) {
    console.error("[batches GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load batches" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const write = await requireBatchWrite(request);
    if (!write.ok) return write.response;

    const body = await request.json();
    const parsed = batchWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ") },
        { status: 422 },
      );
    }

    const data = parsed.data;

    await dbConnect();

    const { teacherIds, seniorTeacherIds } = await resolveBatchAssignees(data.teacherIds);

    const batch = new Batch({
      batchName: data.batchName,
      batchCode: data.batchCode || generateBatchCode(data.batchName),
      courseName: data.courseName,
      batchDay: data.batchDay,
      batchTime: data.batchTime,
      startMonth: data.startMonth,
      endMonth: data.endMonth,
      branch: data.branch,
      batchCapacity: data.batchCapacity,
      description: data.description,
      teacherIds,
      seniorTeacherIds: [],
      students: [],
    });

    applyBatchWriteToDocument(batch, data);
    batch.teacherIds = teacherIds;
    applySeniorOwnership(batch, seniorTeacherIds, write.access);
    await batch.save();

    await syncTeacherAssignedBatches(batch._id.toString(), teacherIds.map(id => id.toString()));

    const populated = await Batch.findById(batch._id).populate("teacherIds", "fullName email");
    const doc = populated as BatchDocument | null;
    if (!doc) {
      return NextResponse.json({ success: false, error: "Batch not found after create" }, { status: 500 });
    }

    const emailWarnings = await notifyAssignedTeachers(doc);

    return NextResponse.json({
      success: true,
      data: { batch: serializeBatch(doc) },
      message: "Batch created and assigned to selected teachers",
      warnings: emailWarnings.length ? emailWarnings : undefined,
    });
  } catch (e) {
    console.error("[batches POST]", e);
    return NextResponse.json({ success: false, error: "Failed to create batch" }, { status: 500 });
  }
}
