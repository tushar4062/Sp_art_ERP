import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Course from '@/lib/models/Course';

export const runtime = 'nodejs';
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    await dbConnect();
    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    return NextResponse.json({
      course: {
        id: course._id.toString(),
        courseTitle: course.courseTitle,
        courseCode: course.courseCode,
        instructor: course.instructor,
        duration: course.duration,
        startDate: course.startDate?.toISOString() ?? '',
        endDate: course.endDate?.toISOString() ?? '',
        totalFees: course.totalFees,
        discountFees: course.discountFees,
        discountPercentage: course.discountPercentage,
        status: course.status,
        notes: course.notes,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    await dbConnect();
    const body = await request.json();
    const {
      courseTitle,
      courseCode,
      instructor,
      duration,
      startDate,
      endDate,
      totalFees,
      discountFees,
      status,
      notes,
    } = body;

    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (courseTitle) updateData.courseTitle = courseTitle;
    if (courseCode) {
      const existingCourse = await Course.findOne({ courseCode, _id: { $ne: id } });
      if (existingCourse) {
        return NextResponse.json({ error: 'Course code already exists' }, { status: 409 });
      }
      updateData.courseCode = courseCode;
    }
    if (instructor !== undefined) updateData.instructor = instructor;
    if (duration !== undefined) updateData.duration = Number(duration);
    if (startDate !== undefined) {
      const parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        return NextResponse.json({ error: 'Start date is invalid' }, { status: 400 });
      }
      updateData.startDate = parsedStartDate;
    }
    if (endDate !== undefined) {
      const parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return NextResponse.json({ error: 'End date is invalid' }, { status: 400 });
      }
      updateData.endDate = parsedEndDate;
    }
    if (totalFees !== undefined) updateData.totalFees = Number(totalFees);
    if (discountFees !== undefined) updateData.discountFees = Number(discountFees);

    if (totalFees !== undefined || discountFees !== undefined) {
      const currentTotal = totalFees !== undefined ? Number(totalFees) : course.totalFees;
      const currentDiscountFees = discountFees !== undefined ? Number(discountFees) : course.discountFees;
      updateData.discountPercentage = currentTotal > 0
        ? Math.max(0, Math.round(((currentTotal - currentDiscountFees) / currentTotal) * 100))
        : 0;
    }
    if (status) {
      if (!['active', 'inactive'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;
    }
    if (notes !== undefined) updateData.notes = notes;

    const updatedCourse = await Course.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Course updated successfully',
      course: {
        id: updatedCourse._id.toString(),
        courseTitle: updatedCourse.courseTitle,
        courseCode: updatedCourse.courseCode,
        instructor: updatedCourse.instructor,
        duration: updatedCourse.duration,
        startDate: updatedCourse.startDate?.toISOString() ?? '',
        endDate: updatedCourse.endDate?.toISOString() ?? '',
        totalFees: updatedCourse.totalFees,
        discountFees: updatedCourse.discountFees,
        discountPercentage: updatedCourse.discountPercentage,
        status: updatedCourse.status,
        notes: updatedCourse.notes,
        createdAt: updatedCourse.createdAt,
        updatedAt: updatedCourse.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    await dbConnect();
    const course = await Course.findByIdAndDelete(id);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
