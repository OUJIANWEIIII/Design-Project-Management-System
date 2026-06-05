import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { ReminderStatus, ReminderType } from "./enums";
import { buildProjectMessage, cleanupOldReminderRecords } from "./reminders";

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

  it("removes sent reminder records immediately and keeps pending records", async () => {
    const now = new Date("2026-06-03T09:00:00+08:00");
    const old = new Date("2026-05-31T09:00:00+08:00");
    const recent = new Date("2026-06-02T09:00:00+08:00");
    const oldSent = await createReminder(ReminderStatus.SENT, old, old);
    const oldFailed = await createReminder(ReminderStatus.FAILED, old);
    const recentSent = await createReminder(ReminderStatus.SENT, recent, recent);
    const oldPending = await createReminder(ReminderStatus.PENDING, old);

    const result = await cleanupOldReminderRecords(now);
    expect(result.count).toBeGreaterThanOrEqual(3);

    const remaining = await prisma.reminder.findMany({ where: { id: { in: [oldSent.id, oldFailed.id, recentSent.id, oldPending.id] } } });
    const remainingIds = new Set(remaining.map((item) => item.id));
    expect(remainingIds.has(oldSent.id)).toBe(false);
    expect(remainingIds.has(oldFailed.id)).toBe(false);
    expect(remainingIds.has(recentSent.id)).toBe(false);
    expect(remainingIds.has(oldPending.id)).toBe(true);
  });
});

describe("project reminder message", () => {
  it("uses current round dates for next round start reminder", () => {
    const namesById = new Map([
      ["owner1", "负责人"],
      ["designer1", "设计师一"],
      ["designer2", "设计师二"]
    ]);
    const message = buildProjectMessage({
      id: "p1",
      name: "二轮项目",
      level: "C",
      division: "REFRIGERATION",
      requestType: "B2B",
      status: "IN_PROGRESS",
      designOwnerId: "owner1",
      designerIds: JSON.stringify(["designer1"]),
      startDate: new Date("2026-05-22T00:00:00+08:00"),
      targetDeliveryDate: null,
      autoDeliveryDate: null,
      alignmentDate: new Date("2026-05-26T00:00:00+08:00"),
      deliveryDate: new Date("2026-05-29T00:00:00+08:00"),
      completedAt: null,
      scheduleStoppedAt: null,
      isUnscheduled: false,
      allowReminder: true,
      currentRoundIndex: 2,
      notes: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      rounds: [
        {
          roundIndex: 2,
          level: "C",
          designerIds: JSON.stringify(["designer1", "designer2"]),
          startDate: new Date("2026-06-04T00:00:00+08:00"),
          alignmentDate: new Date("2026-06-08T00:00:00+08:00"),
          deliveryDate: new Date("2026-06-10T00:00:00+08:00")
        }
      ]
    } as never, ReminderType.PROJECT_CREATED, namesById, "新一轮设计开始");

    expect(message).toContain("【新一轮设计开始】");
    expect(message).toContain("轮次：R2");
    expect(message).toContain("设计师：设计师一、设计师二");
    expect(message).toContain("计划：2026/06/04 - 2026/06/10");
    expect(message).not.toContain("2026/05/22");
  });
});
