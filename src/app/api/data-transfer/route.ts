import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const exportVersion = 1;

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") as Record<string, unknown>[] : [];
}

export async function GET() {
  const data = {
    projects: await prisma.project.findMany({ orderBy: { createdAt: "asc" } }),
    projectRounds: await prisma.projectRound.findMany({ orderBy: [{ projectId: "asc" }, { roundIndex: "asc" }] }),
    feedbackEvents: await prisma.feedbackEvent.findMany({ orderBy: { createdAt: "asc" } }),
    designers: await prisma.designer.findMany({ orderBy: { createdAt: "asc" } }),
    projectProposals: await prisma.projectProposal.findMany({ orderBy: { createdAt: "asc" } }),
    projectPatents: await prisma.projectPatent.findMany({ orderBy: { createdAt: "asc" } }),
    projectScheduleItems: await prisma.projectScheduleItem.findMany({ orderBy: [{ date: "asc" }, { workdayIndex: "asc" }] }),
    reminders: await prisma.reminder.findMany({ orderBy: { createdAt: "asc" } }),
    reminderSendLocks: await prisma.reminderSendLock.findMany({ orderBy: { createdAt: "asc" } }),
    settings: await prisma.settings.findMany()
  };

  return new Response(JSON.stringify({
    app: "industrial-design-ops",
    version: exportVersion,
    exportedAt: new Date().toISOString(),
    data
  }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="industrial-design-ops-backup-${new Date().toISOString().slice(0, 10)}.json"`
    }
  });
}

export async function POST(request: Request) {
  const input = await request.json();
  const payload = input && typeof input === "object" && "data" in input ? (input.data as Record<string, unknown>) : input as Record<string, unknown>;

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "备份文件格式不正确。" }, { status: 400 });
  }

  const counts = await prisma.$transaction(async (tx) => {
    await tx.reminderSendLock.deleteMany();
    await tx.reminder.deleteMany();
    await tx.projectProposal.deleteMany();
    await tx.projectPatent.deleteMany();
    await tx.projectScheduleItem.deleteMany();
    await tx.feedbackEvent.deleteMany();
    await tx.projectRound.deleteMany();
    await tx.project.deleteMany();
    await tx.designer.deleteMany();
    await tx.settings.deleteMany();

    const designers = records(payload.designers);
    const settings = records(payload.settings);
    const projects = records(payload.projects);
    const projectRounds = records(payload.projectRounds);
    const projectScheduleItems = records(payload.projectScheduleItems);
    const feedbackEvents = records(payload.feedbackEvents);
    const projectProposals = records(payload.projectProposals);
    const projectPatents = records(payload.projectPatents);
    const reminders = records(payload.reminders);
    const reminderSendLocks = records(payload.reminderSendLocks);

    if (designers.length) await tx.designer.createMany({ data: designers as never[] });
    if (settings.length) await tx.settings.createMany({ data: settings as never[] });
    if (projects.length) await tx.project.createMany({ data: projects as never[] });
    if (projectRounds.length) await tx.projectRound.createMany({ data: projectRounds as never[] });
    if (projectScheduleItems.length) await tx.projectScheduleItem.createMany({ data: projectScheduleItems as never[] });
    if (feedbackEvents.length) await tx.feedbackEvent.createMany({ data: feedbackEvents as never[] });
    if (projectProposals.length) await tx.projectProposal.createMany({ data: projectProposals as never[] });
    if (projectPatents.length) await tx.projectPatent.createMany({ data: projectPatents as never[] });
    if (reminders.length) await tx.reminder.createMany({ data: reminders as never[] });
    if (reminderSendLocks.length) await tx.reminderSendLock.createMany({ data: reminderSendLocks as never[] });

    return {
      designers: designers.length,
      projects: projects.length,
      rounds: projectRounds.length,
      scheduleItems: projectScheduleItems.length,
      reminders: reminders.length,
      proposals: projectProposals.length,
      patents: projectPatents.length
    };
  });

  return NextResponse.json({ ok: true, counts });
}
