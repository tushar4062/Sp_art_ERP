import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Course from '@/lib/models/Course';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const courses = await Course.find().sort({ createdAt: -1 });
    return NextResponse.json({
      courses: courses.map((course) => ({
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
      })),
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Drop old index if it exists
    try {
      await Course.collection.dropIndex('code_1');
      console.log('Dropped old code_1 index');
    } catch (err) {
      // Index might not exist, that's fine
    }
    
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
      status = 'active',
      notes,
      createdBy,
    } = body;

    if (!courseTitle || !courseCode || duration == null || totalFees == null || discountFees == null || !startDate || !endDate || !status) {
      return NextResponse.json({ error: 'Course title, code, duration, dates, total fees, discount fees, and status are required' }, { status: 400 });
    }

    if (!['active', 'inactive'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const existingCourse = await Course.findOne({ courseCode });
    if (existingCourse) {
      return NextResponse.json({ error: 'Course code already exists' }, { status: 409 });
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return NextResponse.json({ error: 'Dates are invalid' }, { status: 400 });
    }

    const totalFeesNumber = Number(totalFees);
    const discountFeesNumber = Number(discountFees);
    const discountPercentage = totalFeesNumber > 0
      ? Math.max(0, Math.round(((totalFeesNumber - discountFeesNumber) / totalFeesNumber) * 100))
      : 0;

    const course = await Course.create({
      courseTitle,
      courseCode,
      instructor: instructor || undefined,
      duration: Number(duration),
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      totalFees: totalFeesNumber,
      discountFees: discountFeesNumber,
      discountPercentage,
      status,
      notes,
      createdBy,
    });

    return NextResponse.json(
      {
        message: 'Course created successfully',
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
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving course:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
