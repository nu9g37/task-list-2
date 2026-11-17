import { requireWorkspace } from "@/features/workspace/server/request";
import { CalendarScreen } from "@/features/calendar/components/calendar-screen";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calendar · Tasklist 2" };

export default async function CalendarPage() {
  const initialData = await requireWorkspace();
  return <CalendarScreen key={initialData.asOf} initialData={initialData} />;
}
