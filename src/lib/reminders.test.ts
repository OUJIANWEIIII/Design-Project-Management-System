import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { ReminderStatus, ReminderType } from "./enums";
import { cleanupOldReminderRecords } from "./reminders";

const createdIds: string[] = [];

async function createReminder(status: string, scheduledAt: Date, sentAt: Date | null = null) {
  const reminder = await prisma.reminder.create({
    data: {
      type: ReminderType.WEEKLY_SCHEDULE,
      scheduledAt,
      sentAt,
      channel: "企业微信群机器人",
      status,
      messageContent: "QA cleanup reminder"
    }
  });
  createdIds.push(reminder.id);
  return reminder;
}

describe("reminder cleanup", () => {
  afterEach(async () => {
    await prisma.reminder.deleteMany({ where: { id: { in: createdIds.splice(0) } } });
  });

  it("removes finished reminder records after two days and keeps pending records", async () => {
    const now = new Date("2026-06-03T09:00:00+08:00");
    const old = new Date("2026-05-31T09:00:00+08:00");
    const recent = new Date("2026-06-02T09:00:00+08:00");
    const oldSent = await createReminder(ReminderStatus.SENT, old, old);
    const oldFailed = await createReminder(ReminderStatus.FAILED, old);
    const recentSent = await createReminder(ReminderStatus.SENT, recent, recent);
    const oldPending = await createReminder(ReminderStatus.PENDING, old);

    const result = await cleanupOldReminderRecords(now);
    expect(result.count).toBeGreaterThanOrEqual(2);

    const remaining = await prisma.reminder.findMany({ where: { id: { in: [oldSent.id, oldFailed.id, recentSent.id, oldPending.id] } } });
    const remainingIds = new Set(remaining.map((item) => item.id));
    expect(remainingIds.has(oldSent.id)).toBe(false);
    expect(remainingIds.has(oldFailed.id)).toBe(false);
    expect(remainingIds.has(recentSent.id)).toBe(true);
    expect(remainingIds.has(oldPending.id)).toBe(true);
  });
});
