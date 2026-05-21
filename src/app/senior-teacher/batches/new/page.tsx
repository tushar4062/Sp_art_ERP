import { redirect } from "next/navigation";

export default function LegacyNewBatchRedirect() {
  redirect("/senior-teacher/batches/create");
}
