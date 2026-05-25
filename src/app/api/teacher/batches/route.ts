import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Batch, { type BatchDocument } from "@/lib/models/Batch";
import TeacherAttendance from "@/lib/models/TeacherAttendance";
import { requireTeacherFromRequest } from "@/lib/auth/require-teacher";
import { serializeBatch } from "@/lib/serializers/batchSerialize";
import { serializeTeacherAttendance } from "@/lib/serializers/teacherAttendanceSerialize";
import type { TeacherAttendanceDocument } from "@/lib/models/TeacherAttendance";
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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const teacherId = auth.teacher.id;
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = resolvePageSize(searchParams);
    const search = (searchParams.get("search") || "").trim();
    const course = (searchParams.get("course") || "").trim();
    const status = (searchParams.get("status") || "All").trim();

    const teacherOid = new mongoose.Types.ObjectId(teacherId);
    const filter: Record<string, unknown> = {
      teacherIds: teacherOid,
    };

    if (course && course !== "All") filter.courseName = course;
    if (status && status !== "All") filter.batchStatus = status;

    if (search) {
      const esc = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(esc, "i");
      filter.$or = [
        { batchName: rx },
        { batchCode: rx },
        { courseName: rx },
        { batchTiming: rx },
        { roomNumber: rx },
      ];
    }

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
    const todayRecords = batchIds.length
      ? await TeacherAttendance.find({
          role: { $in: ["teacher", null] },
          teacherId: teacherOid,
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
    const courseOptions = await Batch.distinct("courseName", { teacherIds: teacherOid });

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
          courses: (courseOptions as string[]).filter(Boolean).sort(),
        },
      },
    });
  } catch (e) {
    console.error("[teacher/batches GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load assigned batches" }, { status: 500 });
  }
}
