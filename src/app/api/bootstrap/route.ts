import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listProjects } from "@/lib/projects";
import { rebuildReminderPlan, sendDueReminders } from "@/lib/reminders";

export async function GET() {
  await rebuildReminderPlan();
  await sendDueReminders();
  const [projects, designers, reminders, settings] = await Promise.all([
    listProjects(),
    prisma.designer.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.reminder.findMany({ orderBy: { scheduledAt: "asc" } }),
    prisma.settings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } })
  ]);
  return NextResponse.json({ projects, designers, reminders, settings });
}
