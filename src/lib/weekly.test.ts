import { describe, expect, it } from "vitest";
import { getWeeklyProjectItemsForDate, weeklyStageLabel, type WeeklyProject } from "./weekly";
import { ProjectStatus } from "./enums";

const baseProject: WeeklyProject = {
  id: "p1",
  status: ProjectStatus.IN_PROGRESS,
  isUnscheduled: false,
  designerIds: ["d1"],
  currentRoundIndex: 1,
  completedAt: null,
  scheduleStoppedAt: null,
  scheduleItems: [
    {
      id: "p1-d1",
      roundIndex: 1,
      date: "2026-06-01",
      workdayIndex: 1,
      phaseName: "需求理解与设计准备",
      isAlignmentNode: false,
      isDeliveryNode: false,
      designerIds: ["d1"]
    },
    {
      id: "p1-d2",
      roundIndex: 1,
      date: "2026-06-02",
      workdayIndex: 2,
      phaseName: "设计深化与输出交付",
      isAlignmentNode: false,
      isDeliveryNode: true,
      designerIds: ["d1"]
    }
  ]
};

describe("weekly overview date facts", () => {
  it("keeps historical labels and adds waiting feedback only on the stop date", () => {
    const project: WeeklyProject = {
      ...baseProject,
      status: ProjectStatus.WAITING_FEEDBACK,
      scheduleStoppedAt: "2026-06-03T09:20:00.000Z"
    };

    const day1 = getWeeklyProjectItemsForDate(project, "2026-06-01");
    const stopDay = getWeeklyProjectItemsForDate(project, "2026-06-03");
    const futureDay = getWeeklyProjectItemsForDate(project, "2026-06-04");

    expect(weeklyStageLabel(project, day1[0])).toBe("需求理解");
    expect(stopDay).toHaveLength(1);
    expect(weeklyStageLabel(project, stopDay[0])).toBe("待反馈");
    expect(futureDay).toHaveLength(0);
  });

  it("continues delayed projects after delivery without changing stored history", () => {
    const project: WeeklyProject = {
      ...baseProject,
      status: ProjectStatus.DELAYED
    };

    const deliveryDay = getWeeklyProjectItemsForDate(project, "2026-06-02");
    const delayedDay = getWeeklyProjectItemsForDate(project, "2026-06-03");

    expect(weeklyStageLabel(project, deliveryDay[0])).toBe("设计交付");
    expect(delayedDay).toHaveLength(1);
    expect(weeklyStageLabel(project, delayedDay[0])).toBe("延期");
  });

  it("does not schedule unscheduled projects", () => {
    const project: WeeklyProject = {
      ...baseProject,
      isUnscheduled: true,
      scheduleItems: []
    };

    expect(getWeeklyProjectItemsForDate(project, "2026-06-03")).toHaveLength(0);
  });
});
