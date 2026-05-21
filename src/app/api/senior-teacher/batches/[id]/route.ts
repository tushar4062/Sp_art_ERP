import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Batch, { type BatchDocument } from "@/lib/models/Batch";
import { requireBatchRead, requireBatchWrite } from "@/lib/auth/require-batch-access";
import { batchWriteSchema } from "@/lib/validators/batch";
import { serializeBatch } from "@/lib/serializers/batchSerialize";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireBatchRead(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid batch id" }, { status: 400 });
    }

    await dbConnect();
    const doc = await Batch.findById(id).populate("teacherIds", "fullName email phone");
    if (!doc) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { batch: serializeBatch(doc as BatchDocument) } });
  } catch (e) {
    console.error("[batches/[id] GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load batch" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const write = await requireBatchWrite(request);
    if (!write.ok) return write.response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid batch id" }, { status: 400 });
    }

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
      .filter(tid => mongoose.Types.ObjectId.isValid(tid))
      .map(tid => new mongoose.Types.ObjectId(tid));

    await dbConnect();
    const batch = await Batch.findById(id);
    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    batch.batchName = data.batchName;
    batch.courseName = data.courseName;
    batch.batchDay = data.batchDay;
    batch.batchTime = data.batchTime;
    batch.startMonth = data.startMonth;
    batch.endMonth = data.endMonth;
    batch.branch = data.branch;
    batch.batchCapacity = data.batchCapacity;
    batch.description = data.description ?? "";
    batch.teacherIds = teacherIds;
    batch.set(
      "students",
      data.students.map(s => ({
        studentName: s.studentName,
        studentEmail: s.studentEmail || "",
        phone: s.phone || "",
        course: s.course || "",
        batchDay: s.batchDay || "",
        batchTime: s.batchTime || "",
        startMonth: s.startMonth || "",
        endMonth: s.endMonth || "",
      })),
    );

    await batch.save();

    const populated = await Batch.findById(batch._id).populate("teacherIds", "fullName email phone");
    return NextResponse.json({
      success: true,
      data: { batch: serializeBatch(populated as BatchDocument) },
      message: "Batch updated",
    });
  } catch (e) {
    console.error("[batches/[id] PUT]", e);
    return NextResponse.json({ success: false, error: "Failed to update batch" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const write = await requireBatchWrite(request);
    if (!write.ok) return write.response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid batch id" }, { status: 400 });
    }

    await dbConnect();
    const res = await Batch.findByIdAndDelete(id);
    if (!res) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Batch deleted" });
  } catch (e) {
    console.error("[batches/[id] DELETE]", e);
    return NextResponse.json({ success: false, error: "Failed to delete batch" }, { status: 500 });
  }
}
