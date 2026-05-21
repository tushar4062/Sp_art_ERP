import { BatchEditPage } from "@/components/senior-teacher/batches/BatchEditPage";

type Props = { params: Promise<{ id: string }> };

export default async function SeniorTeacherEditBatchPage({ params }: Props) {
  const { id } = await params;
  return <BatchEditPage id={id} />;
}
