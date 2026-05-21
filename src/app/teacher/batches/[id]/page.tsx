import { TeacherBatchDetailPage } from "@/components/teacher/TeacherBatchDetailPage";

type Props = { params: Promise<{ id: string }> };

export default async function TeacherBatchDetailRoute({ params }: Props) {
  const { id } = await params;
  return <TeacherBatchDetailPage batchId={id} />;
}
