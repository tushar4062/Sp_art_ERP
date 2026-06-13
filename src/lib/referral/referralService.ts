import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Student from "@/lib/models/Student";
import ReferralSetting, { type ReferralPercentage } from "@/lib/models/ReferralSetting";
import StudentReferralProfile from "@/lib/models/StudentReferralProfile";
import ReferralTransaction from "@/lib/models/ReferralTransaction";
import ReferralWalletTransaction from "@/lib/models/ReferralWalletTransaction";
import EnrollmentPaymentRecord from "@/lib/models/EnrollmentPaymentRecord";
import CourseEnrollment from "@/lib/models/CourseEnrollment";
import Course from "@/lib/models/Course";
import { sendReferralUsedEmail } from "@/lib/email/referralEmail";

const ALLOWED_PERCENTAGES: ReferralPercentage[] = [5, 10, 15, 20];
const REFERRAL_CODE_PREFIX = "SPARTRF-";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function formatReferralCode(sequence: number) {
  return `${REFERRAL_CODE_PREFIX}${String(sequence).padStart(4, "0")}`;
}

export async function generateNextReferralCode() {
  await dbConnect();

  const profiles = await StudentReferralProfile.find().select("referralCode").lean();
  let maxSequence = 0;

  for (const profile of profiles) {
    const match = profile.referralCode.match(/^SPARTRF-(\d+)$/i);
    if (match) {
      maxSequence = Math.max(maxSequence, Number.parseInt(match[1], 10));
    }
  }

  let sequence = maxSequence + 1;
  let code = formatReferralCode(sequence);

  while (await StudentReferralProfile.findOne({ referralCode: code })) {
    sequence += 1;
    code = formatReferralCode(sequence);
  }

  return code;
}

export async function ensureDefaultReferralSettings() {
  await dbConnect();
  const count = await ReferralSetting.countDocuments();
  if (count > 0) return;

  await ReferralSetting.insertMany(
    ALLOWED_PERCENTAGES.map((percentage, index) => ({
      percentage,
      status: index === 1 ? "active" : "inactive",
    })),
  );
}

export async function getActiveReferralPercentage(): Promise<number | null> {
  await dbConnect();
  const setting = await ReferralSetting.findOne({ status: "active" }).sort({ updatedAt: -1 });
  if (!setting) return null;
  if (setting.expiresAt && setting.expiresAt < new Date()) return null;
  return setting.percentage;
}

export async function ensureStudentReferralProfile(studentId: string) {
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new Error("Invalid student ID");
  }

  const existing = await StudentReferralProfile.findOne({
    studentId: new mongoose.Types.ObjectId(studentId),
  });
  if (existing) return existing;

  const student = await Student.findById(studentId);
  if (!student) throw new Error("Student not found");

  const code = await generateNextReferralCode();

  return StudentReferralProfile.create({
    studentId: student._id,
    referralCode: code,
    totalReferrals: 0,
    totalEarnings: 0,
    availableBalance: 0,
  });
}

export type ValidateReferralResult =
  | {
      valid: true;
      referralCode: string;
      referrerId: string;
      referrerName: string;
      referralPercentage: number;
    }
  | { valid: false; error: string };

export async function validateReferralCode(
  code: string,
  currentStudentId: string,
): Promise<ValidateReferralResult> {
  await dbConnect();

  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return { valid: false, error: "Referral code is required" };
  }

  const percentage = await getActiveReferralPercentage();
  if (percentage === null) {
    return { valid: false, error: "Referral program is currently inactive" };
  }

  const profile = await StudentReferralProfile.findOne({ referralCode: normalized });
  if (!profile) {
    return { valid: false, error: "Invalid referral code" };
  }

  if (profile.studentId.toString() === currentStudentId) {
    return { valid: false, error: "You cannot use your own referral code" };
  }

  const referrer = await Student.findById(profile.studentId);
  if (!referrer) {
    return { valid: false, error: "Invalid referral code" };
  }

  return {
    valid: true,
    referralCode: normalized,
    referrerId: profile.studentId.toString(),
    referrerName: referrer.fullName,
    referralPercentage: percentage,
  };
}

export async function createPendingReferralTransaction(params: {
  referrerId: string;
  referredStudentId: string;
  referredStudentName: string;
  referralCode: string;
  referralPercentage: number;
  courseAmount: number;
  orderId: string;
}) {
  await dbConnect();

  const existing = await ReferralTransaction.findOne({ orderId: params.orderId });
  if (existing) return existing;

  return ReferralTransaction.create({
    referrerId: new mongoose.Types.ObjectId(params.referrerId),
    referredStudentId: new mongoose.Types.ObjectId(params.referredStudentId),
    referredStudentName: params.referredStudentName,
    referralCode: params.referralCode.toUpperCase(),
    referralPercentage: params.referralPercentage,
    courseAmount: params.courseAmount,
    earnedAmount: 0,
    enrollmentStatus: false,
    paymentStatus: "pending",
    orderId: params.orderId,
  });
}

export async function completeReferralOnPayment(params: {
  referredStudentId: string;
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  courseAmount: number;
  orderId: string;
  referralCode?: string;
}) {
  await dbConnect();

  const { referredStudentId, enrollmentId, courseId, courseTitle, courseAmount, orderId } =
    params;

  let transaction = await ReferralTransaction.findOne({ orderId });
  const referralCode = params.referralCode?.trim().toUpperCase();

  if (!transaction && referralCode) {
    const validation = await validateReferralCode(referralCode, referredStudentId);
    if (validation.valid === false) return null;

    const referredStudent = await Student.findById(referredStudentId);
    transaction = await ReferralTransaction.create({
      referrerId: new mongoose.Types.ObjectId(validation.referrerId),
      referredStudentId: new mongoose.Types.ObjectId(referredStudentId),
      referredStudentName: referredStudent?.fullName ?? "Student",
      referralCode: validation.referralCode,
      referralPercentage: validation.referralPercentage,
      courseAmount,
      earnedAmount: 0,
      enrollmentStatus: false,
      paymentStatus: "pending",
      orderId,
    });
  }

  if (!transaction || transaction.enrollmentStatus) {
    return transaction;
  }

  const effectiveCourseAmount = Math.max(
    courseAmount,
    transaction.courseAmount ?? 0,
  );
  const earnedAmount = round2((effectiveCourseAmount * transaction.referralPercentage) / 100);

  transaction.enrollmentId = new mongoose.Types.ObjectId(enrollmentId);
  transaction.courseId = new mongoose.Types.ObjectId(courseId);
  transaction.courseTitle = courseTitle;
  transaction.courseAmount = effectiveCourseAmount;
  transaction.earnedAmount = earnedAmount;
  transaction.enrollmentStatus = true;
  transaction.paymentStatus = "paid";
  await transaction.save();

  const profile = await ensureStudentReferralProfile(transaction.referrerId.toString());

  profile.totalReferrals += 1;
  if (earnedAmount > 0) {
    profile.totalEarnings = round2(profile.totalEarnings + earnedAmount);
    profile.availableBalance = round2(profile.availableBalance + earnedAmount);
  }
  await profile.save();

  if (earnedAmount > 0) {
    await ReferralWalletTransaction.create({
      studentId: profile.studentId,
      type: "credit",
      amount: earnedAmount,
      description: `Referral reward — ${courseTitle}`,
      referralTransactionId: transaction._id,
      balanceAfter: profile.availableBalance,
    });
  }

  const referrer = await Student.findById(transaction.referrerId);
  if (referrer?.email) {
    try {
      await sendReferralUsedEmail({
        referrerEmail: referrer.email,
        referrerName: referrer.fullName,
        referredStudentName: transaction.referredStudentName,
        courseTitle,
        earnedAmount,
        referralCode: transaction.referralCode,
      });
    } catch (err) {
      console.error("Referral email failed:", err);
    }
  }

  return transaction;
}

/** Complete referral rows left pending after a successful Razorpay payment. */
export async function reconcilePendingReferralTransactions() {
  await dbConnect();

  const pending = await ReferralTransaction.find({
    enrollmentStatus: false,
    orderId: { $exists: true, $ne: null },
  });

  let repaired = 0;

  for (const transaction of pending) {
    const paymentRecord = await EnrollmentPaymentRecord.findOne({
      orderId: transaction.orderId,
      paymentStatus: "paid",
    });

    if (!paymentRecord) continue;

    const enrollment = await CourseEnrollment.findById(paymentRecord.enrollmentId);
    if (!enrollment) continue;

    const course = await Course.findById(enrollment.courseId);

    await completeReferralOnPayment({
      referredStudentId: transaction.referredStudentId.toString(),
      enrollmentId: enrollment._id.toString(),
      courseId: enrollment.courseId.toString(),
      courseTitle: course?.courseTitle ?? "Course",
      courseAmount: Number(enrollment.totalAmount ?? enrollment.amount ?? paymentRecord.amount ?? 0),
      orderId: transaction.orderId!,
      referralCode: transaction.referralCode,
    });
    repaired += 1;
  }

  return repaired;
}

export async function getStudentReferralDashboard(studentId: string) {
  await dbConnect();
  const profile = await ensureStudentReferralProfile(studentId);

  const transactions = await ReferralTransaction.find({ referrerId: profile.studentId }).sort({
    createdAt: -1,
  });

  const walletHistory = await ReferralWalletTransaction.find({ studentId: profile.studentId })
    .sort({ createdAt: -1 })
    .limit(50);

  const successful = transactions.filter(t => t.enrollmentStatus).length;
  const pending = transactions.filter(t => !t.enrollmentStatus).length;
  const activePercentage = await getActiveReferralPercentage();

  return {
    referralCode: profile.referralCode,
    totalReferrals: profile.totalReferrals,
    totalEarnings: profile.totalEarnings,
    availableBalance: profile.availableBalance,
    successfulEnrollments: successful,
    pendingReferrals: pending,
    activeReferralPercentage: activePercentage,
    referrals: transactions.map(t => ({
      id: t._id.toString(),
      referralCode: t.referralCode,
      referredStudentName: t.referredStudentName,
      referredStudentId: t.referredStudentId.toString(),
      referralPercentage: t.referralPercentage,
      enrollmentStatus: t.enrollmentStatus,
      paymentStatus: t.paymentStatus,
      earnedAmount: t.earnedAmount,
      courseTitle: t.courseTitle,
      courseAmount: t.courseAmount,
      createdAt: t.createdAt,
    })),
    walletHistory: walletHistory.map(w => ({
      id: w._id.toString(),
      type: w.type,
      amount: w.amount,
      description: w.description,
      balanceAfter: w.balanceAfter,
      createdAt: w.createdAt,
    })),
  };
}

export async function getAdminReferralReport(filters?: {
  studentId?: string;
  referralCode?: string;
  status?: "all" | "success" | "pending";
  from?: string;
  to?: string;
}) {
  await dbConnect();

  await ensureDefaultReferralSettings();

  const query: Record<string, unknown> = {};
  if (filters?.studentId && mongoose.Types.ObjectId.isValid(filters.studentId)) {
    query.referrerId = new mongoose.Types.ObjectId(filters.studentId);
  }
  if (filters?.referralCode) {
    query.referralCode = filters.referralCode.trim().toUpperCase();
  }
  if (filters?.status === "success") query.enrollmentStatus = true;
  if (filters?.status === "pending") query.enrollmentStatus = false;
  if (filters?.from || filters?.to) {
    query.createdAt = {};
    if (filters.from) (query.createdAt as Record<string, Date>).$gte = new Date(filters.from);
    if (filters.to) {
      const to = new Date(filters.to);
      to.setHours(23, 59, 59, 999);
      (query.createdAt as Record<string, Date>).$lte = to;
    }
  }

  const [settings, transactions, profiles] = await Promise.all([
    ReferralSetting.find().sort({ percentage: 1 }),
    ReferralTransaction.find(query)
      .populate({ path: "referrerId", model: Student, select: "fullName email badgeId" })
      .sort({ createdAt: -1 }),
    StudentReferralProfile.find()
      .populate({ path: "studentId", model: Student, select: "fullName email" })
      .sort({ totalEarnings: -1 })
      .limit(10),
  ]);

  const activeSetting = settings.find(s => s.status === "active") ?? null;
  const successful = transactions.filter(t => t.enrollmentStatus);
  const totalEarningsDistributed = successful.reduce((s, t) => s + t.earnedAmount, 0);
  const totalRevenue = successful.reduce((s, t) => s + t.courseAmount, 0);

  return {
    settings: settings.map(s => ({
      id: s._id.toString(),
      percentage: s.percentage,
      status: s.status,
      expiresAt: s.expiresAt,
      updatedAt: s.updatedAt,
    })),
    activePercentage: activeSetting?.percentage ?? null,
    stats: {
      totalReferrals: transactions.length,
      successfulEnrollments: successful.length,
      pendingReferrals: transactions.length - successful.length,
      totalEarningsDistributed: round2(totalEarningsDistributed),
      referralRevenue: round2(totalRevenue),
    },
    topReferrers: profiles.map(p => {
      const student = p.studentId as { fullName?: string; email?: string } | null;
      return {
        studentId: p.studentId.toString(),
        studentName: student?.fullName ?? "Unknown",
        referralCode: p.referralCode,
        totalReferrals: p.totalReferrals,
        totalEarnings: p.totalEarnings,
      };
    }),
    transactions: transactions.map(t => {
      const referrer = t.referrerId as { fullName?: string; _id?: mongoose.Types.ObjectId } | null;
      return {
        id: t._id.toString(),
        referralCode: t.referralCode,
        referrerName: referrer?.fullName ?? "Unknown",
        referrerId: referrer?._id?.toString() ?? t.referrerId.toString(),
        referredStudentName: t.referredStudentName,
        referredStudentId: t.referredStudentId.toString(),
        referralPercentage: t.referralPercentage,
        enrollmentStatus: t.enrollmentStatus,
        paymentStatus: t.paymentStatus,
        earnedAmount: t.earnedAmount,
        courseAmount: t.courseAmount,
        courseTitle: t.courseTitle,
        createdAt: t.createdAt,
      };
    }),
    allowedPercentages: ALLOWED_PERCENTAGES,
  };
}

export async function saveReferralSettings(percentage: ReferralPercentage, status: "active" | "inactive") {
  await dbConnect();
  if (!ALLOWED_PERCENTAGES.includes(percentage)) {
    throw new Error("Invalid referral percentage");
  }

  let setting = await ReferralSetting.findOne({ percentage });
  if (!setting) {
    setting = await ReferralSetting.create({ percentage, status });
  } else {
    setting.status = status;
    await setting.save();
  }

  if (status === "active") {
    await ReferralSetting.updateMany(
      { _id: { $ne: setting._id } },
      { $set: { status: "inactive" } },
    );
  }

  return setting;
}
