import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function LegacyEditBatchRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/senior-teacher/batches/edit/${id}`);
}
