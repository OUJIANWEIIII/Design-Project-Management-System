import { NextResponse } from "next/server";
import { rebuildReminderPlan, sendDueReminders } from "@/lib/reminders";

export async function POST() {
  await rebuildReminderPlan();
  const sent = await sendDueReminders();
  return NextResponse.json({ ok: true, sent: sent.length });
}
