import { requireWorkspace } from "@/features/workspace/server/request";
import { OverviewScreen } from "@/features/overview/components/overview-screen";

export default async function Home() {
  const initialData = await requireWorkspace();
  return <OverviewScreen key={initialData.asOf} initialData={initialData} />;
}
