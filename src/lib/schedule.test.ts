import { describe, expect, it, vi } from "vitest";
import { ProjectLevel, ProjectStatus } from "./enums";
import { addWorkdays, calculateAlignmentDate, countWorkdaysBetween, generateProjectSchedule, isDelayed } from "./schedule";
import { toISODate } from "./format";

describe("industrial design schedule rules", () => {
  it("skips weekends when adding workdays", () => {
    expect(toISODate(addWorkdays("2026-06-01", 8))).toBe("2026-06-10");
    expect(toISODate(addWorkdays("2026-06-04", 2))).toBe("2026-06-05");
  });

  it("creates day 3 alignment for A/B/C projects", () => {
    expect(toISODate(calculateAlignmentDate({ level: ProjectLevel.A, startDate: new Date(2026, 5, 1) }))).toBe("2026-06-03");
    expect(calculateAlignmentDate({ level: ProjectLevel.D, startDate: new Date(2026, 5, 1) })).toBeNull();
  });

  it("generates level schedules", () => {
    const base = {
      status: ProjectStatus.IN_PROGRESS,
      startDate: new Date(2026, 5, 1),
      designerIds: ["d1"]
    };
    expect(generateProjectSchedule({ ...base, level: ProjectLevel.A })).toHaveLength(8);
    expect(generateProjectSchedule({ ...base, level: ProjectLevel.C })).toHaveLength(6);
    expect(generateProjectSchedule({ ...base, level: ProjectLevel.D })).toHaveLength(2);
  });

  it("compresses a project schedule to the target delivery window", () => {
    const schedule = generateProjectSchedule({
      level: ProjectLevel.B,
      status: ProjectStatus.IN_PROGRESS,
      startDate: new Date(2026, 5, 1),
      targetDeliveryDate: new Date(2026, 5, 5),
      designerIds: ["d1"]
    });

    expect(countWorkdaysBetween("2026-06-01", "2026-06-05")).toBe(5);
    expect(schedule).toHaveLength(5);
    expect(toISODate(schedule[2].date)).toBe("2026-06-03");
    expect(schedule[2].isAlignmentNode).toBe(true);
    expect(toISODate(schedule[4].date)).toBe("2026-06-05");
    expect(schedule[4].isDeliveryNode).toBe(true);
  });

  it("extends a project schedule when the target delivery window is longer", () => {
    const schedule = generateProjectSchedule({
      level: ProjectLevel.D,
      status: ProjectStatus.IN_PROGRESS,
      startDate: new Date(2026, 5, 1),
      targetDeliveryDate: new Date(2026, 5, 5),
      designerIds: ["d1"]
    });

    expect(schedule).toHaveLength(5);
    expect(toISODate(schedule[4].date)).toBe("2026-06-05");
    expect(schedule[4].phaseName).toBe("修改完善与交付");
  });

  it("does not override stopped statuses with delayed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 10, 9, 0, 0));
    const deliveryDate = new Date(2026, 5, 5);

    expect(isDelayed({ status: ProjectStatus.IN_PROGRESS, deliveryDate })).toBe(true);
    expect(isDelayed({ status: ProjectStatus.WAITING_ALIGNMENT, deliveryDate })).toBe(false);
    expect(isDelayed({ status: ProjectStatus.WAITING_FEEDBACK, deliveryDate })).toBe(false);
    expect(isDelayed({ status: ProjectStatus.COMPLETED, deliveryDate })).toBe(false);
    expect(isDelayed({ status: ProjectStatus.PAUSED, deliveryDate })).toBe(false);

    vi.useRealTimers();
  });
});
