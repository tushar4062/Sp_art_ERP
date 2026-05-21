import { BatchDetailPage } from "@/components/senior-teacher/batches/BatchDetailPage";

type Props = { params: Promise<{ id: string }> };

export default async function AdminBatchDetailRoute({ params }: Props) {
  const { id } = await params;
  return <BatchDetailPage id={id} />;
}
