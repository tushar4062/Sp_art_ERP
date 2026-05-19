import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SeniorTeacher from '@/lib/models/SeniorTeacher';

export const runtime = 'nodejs';

const generateBadgeId = () => {
  return `SRT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
};

async function getUniqueBadgeId() {
  let badgeId = generateBadgeId();
  while (await SeniorTeacher.findOne({ badgeId })) {
    badgeId = generateBadgeId();
  }
  return badgeId;
}

export async function GET() {
  try {
    await dbConnect();
    const teachers = await SeniorTeacher.find().sort({ createdAt: -1 });
    return NextResponse.json({
      teachers: teachers.map((t) => ({
        id: t._id.toString(),
        badgeId: t.badgeId,
        fullName: t.fullName,
        email: t.email,
        phone: t.phone,
        dob: t.dob,
        age: t.age,
        gender: t.gender,
        bloodGroup: t.bloodGroup,
        specialization: t.specialization,
        yearsOfExperience: t.yearsOfExperience,
        role: t.role,
        qualification: t.qualification,
        address: t.address,
        joiningDate: t.joiningDate,
        salary: t.salary,
        bio: t.bio,
        profileImage: t.profileImage,
        status: t.status,
        assignedClasses: t.assignedClasses,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching senior teachers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      badgeId,
      fullName,
      email,
      phone,
      dob,
      age,
      gender,
      bloodGroup,
      specialization,
      yearsOfExperience,
      role,
      qualification,
      address,
      joiningDate,
      salary,
      bio,
      profileImage,
      status = 'Active',
      assignedClasses = 0,
    } = body;

    if (!fullName || !email || !phone || !specialization || yearsOfExperience === undefined || !role || !qualification || !address || !joiningDate || salary === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingEmail = await SeniorTeacher.findOne({ email });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const finalBadgeId = badgeId?.trim() || await getUniqueBadgeId();
    const teacher = await SeniorTeacher.create({
      fullName,
      badgeId: finalBadgeId,
      email,
      phone,
      dob: dob ? new Date(dob) : undefined,
      age,
      gender,
      bloodGroup,
      specialization,
      yearsOfExperience,
      role,
      qualification,
      address,
      joiningDate: new Date(joiningDate),
      salary,
      bio,
      profileImage,
      status,
      assignedClasses,
    });

    return NextResponse.json({
      message: 'Senior teacher created successfully',
      teacher: {
        id: teacher._id.toString(),
        badgeId: teacher.badgeId,
        fullName: teacher.fullName,
        email: teacher.email,
        phone: teacher.phone,
        dob: teacher.dob,
        age: teacher.age,
        gender: teacher.gender,
        bloodGroup: teacher.bloodGroup,
        specialization: teacher.specialization,
        yearsOfExperience: teacher.yearsOfExperience,
        role: teacher.role,
        qualification: teacher.qualification,
        address: teacher.address,
        joiningDate: teacher.joiningDate,
        salary: teacher.salary,
        bio: teacher.bio,
        profileImage: teacher.profileImage,
        status: teacher.status,
        assignedClasses: teacher.assignedClasses,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating senior teacher:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
