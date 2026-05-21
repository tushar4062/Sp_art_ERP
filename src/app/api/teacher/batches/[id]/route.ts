import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Batch, { type BatchDocument } from "@/lib/models/Batch";
import { requireTeacherFromRequest } from "@/lib/auth/require-teacher";
import { teacherCanAccessBatch } from "@/lib/auth/require-batch-access";
import { serializeBatch } from "@/lib/serializers/batchSerialize";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid batch id" }, { status: 400 });
    }

    await dbConnect();

    const allowed = await teacherCanAccessBatch(auth.teacher.id, id);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "You are not assigned to this batch" },
        { status: 403 },
      );
    }

    const doc = await Batch.findById(id).populate("teacherIds", "fullName email");
    if (!doc) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { batch: serializeBatch(doc as BatchDocument) } });
  } catch (e) {
    console.error("[teacher/batches/[id] GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load batch" }, { status: 500 });
  }
}
