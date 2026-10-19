import { getWorkspace } from "@/features/workspace/server/service";
import { OverviewScreen } from "@/features/overview/components/overview-screen";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/features/auth/lib/auth";

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
