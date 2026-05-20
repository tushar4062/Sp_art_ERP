import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Student, { type StudentDocument } from "@/lib/models/Student";
import SeniorTeacher from "@/lib/models/SeniorTeacher";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";

export const runtime = "nodejs";

const PAGE_SIZE = 10;

function formatDate(value: Date | string | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

function studentStatus(doc: StudentDocument): "Active" | "Inactive" {
  return doc.feeStatus === "Paid" ? "Active" : "Inactive";
}

function toStudentJson(doc: StudentDocument) {
  return {
    id: doc._id.toString(),
    fullName: doc.fullName,
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    gender: doc.gender ?? "",
    age: doc.age ?? null,
    course: doc.currentCourse ?? "",
    className: doc.className,
    parentName: doc.parentName ?? doc.fatherName ?? "",
    parentContact: doc.fatherMobile ?? doc.motherMobile ?? doc.phone ?? "",
    address: doc.address ?? "",
    profileImage: doc.photo ?? "",
    status: studentStatus(doc),
    feeStatus: doc.feeStatus,
    attendancePercentage: 0,
    joiningDate: formatDate(doc.createdAt),
    artTeacher: doc.artTeacher ?? "",
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function buildFilter(params: {
  search?: string;
  status?: string;
  className?: string;
  course?: string;
  gender?: string;
}) {
  const filter: Record<string, unknown> = {};

  if (params.status && params.status !== "All") {
    if (params.status === "Active") filter.feeStatus = "Paid";
    else filter.feeStatus = { $in: ["Pending", "Overdue"] };
  }
  if (params.className && params.className !== "All") filter.className = params.className;
  if (params.course && params.course !== "All") filter.currentCourse = params.course;
  if (params.gender && params.gender !== "All") filter.gender = params.gender;

  const search = params.search?.trim();
  const orConditions: Record<string, unknown>[] = [];
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    orConditions.push(
      { fullName: regex },
      { email: regex },
      { className: regex },
      { currentCourse: regex },
    );
  }

  if (orConditions.length === 1) {
    Object.assign(filter, orConditions[0]);
  } else if (orConditions.length > 1) {
    filter.$or = orConditions;
  }

  return filter;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    await dbConnect();

    const senior = await SeniorTeacher.findById(auth.seniorTeacher.id);
    if (!senior) {
      return NextResponse.json({ success: false, error: "Senior teacher not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "All";
    const className = searchParams.get("class") || "All";
    const course = searchParams.get("course") || "All";
    const gender = searchParams.get("gender") || "All";

    const filter = buildFilter({ search, status, className, course, gender });

    const [total, students, classOptions, courseOptions] = await Promise.all([
      Student.countDocuments(filter),
      Student.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      Student.distinct("className", filter),
      Student.distinct("currentCourse", filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return NextResponse.json({
      success: true,
      data: {
        students: students.map(toStudentJson),
        pagination: { page, limit: PAGE_SIZE, total, totalPages },
        filterOptions: {
          classes: classOptions.filter(Boolean).sort(),
          courses: courseOptions.filter(Boolean).sort(),
        },
      },
    });
  } catch (error) {
    console.error("[senior-teacher/students GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load students" }, { status: 500 });
  }
}
