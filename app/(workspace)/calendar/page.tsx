import { getWorkspace } from "@/server/workspace/service";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { CalendarScreen } from "@/components/calendar/calendar-screen";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calendar · Tasklist 2" };

export default async function CalendarPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const initialData = await getWorkspace({
    ...session.user,
    image: session.user.image ?? null,
    timezone: session.user.timezone ?? "UTC",
  });
  return <CalendarScreen key={initialData.asOf} initialData={initialData} />;
}
