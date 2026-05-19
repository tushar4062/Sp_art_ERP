"use client";

import { StudentMyScores } from "@/pages/shared/DrawingTests";
import { useStore } from "@/store/dataStore";

export default function StudentScoresPage() {
  const studentId = useStore(s => s.students[0]?.id ?? "");
  return <StudentMyScores studentId={studentId} />;
}
