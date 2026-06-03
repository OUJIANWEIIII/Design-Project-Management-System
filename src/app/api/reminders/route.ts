import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanupOldReminderRecords } from "@/lib/reminders";

export async function GET() {
  await cleanupOldReminderRecords();
  return NextResponse.json(await prisma.reminder.findMany({ include: { project: true }, orderBy: { scheduledAt: "asc" } }));
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const where = status && status !== "ALL" ? { status } : {};
  const result = await prisma.reminder.deleteMany({ where });
  return NextResponse.json({ ok: true, count: result.count });
}
