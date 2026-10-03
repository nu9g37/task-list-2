import { getWorkspace } from "@/server/workspace/service";
import { OverviewScreen } from "@/components/overview/overview-screen";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

export default async function Home() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const initialData = await getWorkspace({
    ...session.user,
    image: session.user.image ?? null,
    timezone: session.user.timezone ?? "UTC",
  });
  return <OverviewScreen key={initialData.asOf} initialData={initialData} />;
}
