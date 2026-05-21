import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Batch, { type BatchDocument } from "@/lib/models/Batch";
import Teacher from "@/lib/models/Teacher";
import { requireBatchRead, requireBatchWrite } from "@/lib/auth/require-batch-access";
import { batchWriteSchema } from "@/lib/validators/batch";
import { buildTeacherAssignmentEmailHtml, sendTransactionalEmail } from "@/lib/email/mailer";
import { serializeBatch } from "@/lib/serializers/batchSerialize";
import { applyBatchWriteToDocument, generateBatchCode } from "@/lib/batch/applyBatchFields";
import { syncTeacherAssignedBatches } from "@/lib/batch/syncTeacherBatches";

export const runtime = "nodejs";

const PAGE_SIZE = 12;

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
    const seniorOid = new mongoose.Types.ObjectId(access.seniorTeacherId);
    andClauses.push({
      $or: [
        { createdBy: seniorOid },
        { createdBy: { $exists: false } },
        { createdBy: null },
      ],
    });
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
    const auth = await requireBatchRead(request);
    if (!auth.ok) return auth.response;
    if (auth.access.kind === "teacher") {
      return NextResponse.json({ success: false, error: "Use /api/teacher/batches" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const filter = buildListFilter(auth.access, {
      search: (searchParams.get("search") || "").trim(),
      course: (searchParams.get("course") || "").trim(),
      teacherId: (searchParams.get("teacherId") || "").trim(),
      status: (searchParams.get("status") || "All").trim(),
    });

    const skip = (page - 1) * PAGE_SIZE;
    const [total, rows] = await Promise.all([
      Batch.countDocuments(filter),
      Batch.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .populate("teacherIds", "fullName email"),
    ]);

    const batches = rows.map(d => serializeBatch(d as BatchDocument));
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
          limit: PAGE_SIZE,
          total,
          totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
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
    const teacherIds = data.teacherIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    await dbConnect();

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
      students: [],
    });

    if (write.access.kind === "senior") {
      batch.createdBy = new mongoose.Types.ObjectId(write.access.seniorTeacherId);
    }

    applyBatchWriteToDocument(batch, data);
    batch.teacherIds = teacherIds;
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
