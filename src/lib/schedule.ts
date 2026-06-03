import { localDate, toISODate } from "./format";
import { ProjectLevel, ProjectStatus } from "./enums";

export const levelRules: Record<ProjectLevel, { workdays: number; alignDay: number | null }> = {
  A: { workdays: 8, alignDay: 3 },
  B: { workdays: 8, alignDay: 3 },
  C: { workdays: 6, alignDay: 3 },
  D: { workdays: 2, alignDay: null }
};

const phaseRules: Record<ProjectLevel, Record<number, string>> = {
  A: {
    1: "需求理解与设计准备",
    2: "方案探索与方向形成",
    3: "中途对齐",
    4: "方案调整与方向确认",
    5: "设计深化与输出交付",
    6: "设计深化与输出交付",
    7: "设计深化与输出交付",
    8: "设计深化与输出交付"
  },
  B: {
    1: "需求理解与设计准备",
    2: "方案探索与方向形成",
    3: "中途对齐",
    4: "方案调整与方向确认",
    5: "设计深化与输出交付",
    6: "设计深化与输出交付",
    7: "设计深化与输出交付",
    8: "设计深化与输出交付"
  },
  C: {
    1: "需求理解与设计准备",
    2: "方案设计",
    3: "中途对齐",
    4: "设计深化与输出交付",
    5: "设计深化与输出交付",
    6: "设计深化与输出交付"
  },
  D: {
    1: "需求确认与快速设计",
    2: "修改完善与交付"
  }
};

export type SchedulableProject = {
  id?: string;
  level: ProjectLevel;
  status?: ProjectStatus;
  startDate: Date | null;
  targetDeliveryDate?: Date | null;
  designerIds: string[];
};

export function addDays(date: Date, amount: number): Date {
  const next = localDate(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function isWorkday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

export function addWorkdays(startDate: Date | string, workdayCount: number): Date {
  let cursor = typeof startDate === "string" ? localDate(startDate) : localDate(startDate);
  let added = 0;
  while (added < workdayCount) {
    if (isWorkday(cursor)) added += 1;
    if (added < workdayCount) cursor = addDays(cursor, 1);
  }
  return cursor;
}

export function countWorkdaysBetween(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === "string" ? localDate(startDate) : localDate(startDate);
  const end = typeof endDate === "string" ? localDate(endDate) : localDate(endDate);
  if (end.getTime() < start.getTime()) return 0;

  let count = 0;
  let cursor = start;
  while (cursor.getTime() <= end.getTime()) {
    if (isWorkday(cursor)) count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}

export function startOfWeek(date: Date | string): Date {
  const local = typeof date === "string" ? localDate(date) : localDate(date);
  const day = local.getDay();
  return addDays(local, day === 0 ? -6 : 1 - day);
}

export function weekDates(weekStart: Date | string): Date[] {
  const start = typeof weekStart === "string" ? localDate(weekStart) : localDate(weekStart);
  return [0, 1, 2, 3, 4].map((offset) => addDays(start, offset));
}

function getPlannedWorkdays(project: Pick<SchedulableProject, "level" | "startDate" | "targetDeliveryDate">): number {
  if (project.startDate && project.targetDeliveryDate) {
    const targetWindow = countWorkdaysBetween(project.startDate, project.targetDeliveryDate);
    if (targetWindow > 0) return targetWindow;
  }
  return levelRules[project.level].workdays;
}

function getAlignmentWorkday(level: ProjectLevel, plannedWorkdays: number): number | null {
  if (level === "D" || plannedWorkdays < 2) return null;
  return Math.min(3, plannedWorkdays - 1);
}

function getPhaseName(level: ProjectLevel, workdayIndex: number, plannedWorkdays: number, alignmentWorkday: number | null): string {
  if (level === "D") {
    if (plannedWorkdays === 1) return "需求确认、快速设计与交付";
    if (workdayIndex === 1) return "需求确认与快速设计";
    if (workdayIndex === plannedWorkdays) return "修改完善与交付";
    return "快速设计与修改完善";
  }

  if (workdayIndex === 1) return "需求理解与设计准备";
  if (alignmentWorkday && workdayIndex === alignmentWorkday) return "中途对齐";
  if (workdayIndex === plannedWorkdays) return "设计深化与输出交付";

  if (level === "C") {
    if (workdayIndex === 2) return "方案设计";
    return "设计深化与输出交付";
  }

  if (workdayIndex === 2) return "方案探索与方向形成";
  if (alignmentWorkday && workdayIndex > alignmentWorkday) return "方案调整与设计深化";
  return phaseRules[level][workdayIndex] || "设计深化与输出交付";
}

export function calculateAlignmentDate(project: Pick<SchedulableProject, "level" | "startDate" | "targetDeliveryDate">): Date | null {
  if (!project.startDate || project.level === "D") return null;
  const alignmentWorkday = getAlignmentWorkday(project.level, getPlannedWorkdays(project));
  if (!alignmentWorkday) return null;
  return addWorkdays(project.startDate, alignmentWorkday);
}

export function calculateDeliveryDate(project: Pick<SchedulableProject, "level" | "startDate" | "targetDeliveryDate">): Date | null {
  if (project.targetDeliveryDate) return localDate(project.targetDeliveryDate);
  if (!project.startDate) return null;
  return addWorkdays(project.startDate, levelRules[project.level].workdays);
}

export function enrichProjectForSave<T extends {
  level: ProjectLevel;
  status: ProjectStatus;
  startDate?: Date | null;
  targetDeliveryDate?: Date | null;
  designerIds: string[];
}>(project: T) {
  const startDate = project.startDate ? localDate(project.startDate) : null;
  const targetDeliveryDate = project.targetDeliveryDate ? localDate(project.targetDeliveryDate) : null;
  const autoDeliveryDate = startDate ? addWorkdays(startDate, levelRules[project.level].workdays) : null;
  const alignmentDate = calculateAlignmentDate({ level: project.level, startDate, targetDeliveryDate });
  const deliveryDate = calculateDeliveryDate({ level: project.level, startDate, targetDeliveryDate });
  const isUnscheduled = !startDate || project.designerIds.length === 0;
  const status = isDelayed({ ...project, startDate, targetDeliveryDate, deliveryDate }) ? ProjectStatus.DELAYED : project.status;
  return {
    ...project,
    status,
    startDate,
    targetDeliveryDate,
    autoDeliveryDate,
    alignmentDate,
    deliveryDate,
    isUnscheduled
  };
}

export function generateProjectSchedule(project: SchedulableProject) {
  if (!project.startDate || project.designerIds.length === 0) return [];
  const total = getPlannedWorkdays(project);
  const alignmentWorkday = getAlignmentWorkday(project.level, total);
  const dates: Date[] = [];
  let cursor = localDate(project.startDate);
  while (dates.length < total) {
    if (isWorkday(cursor)) dates.push(localDate(cursor));
    cursor = addDays(cursor, 1);
  }
  return dates.map((date, index) => {
    const workdayIndex = index + 1;
    return {
      date,
      workdayIndex,
      phaseName: getPhaseName(project.level, workdayIndex, total, alignmentWorkday),
      isAlignmentNode: alignmentWorkday !== null && workdayIndex === alignmentWorkday,
      isDeliveryNode: workdayIndex === total,
      designerIds: project.designerIds
    };
  });
}

export function getProjectPhaseByDate(project: SchedulableProject, date: Date | string): string {
  const target = toISODate(date);
  const item = generateProjectSchedule(project).find((scheduleItem) => toISODate(scheduleItem.date) === target);
  if (!item) return "";
  if (item.isDeliveryNode) return "最终交付";
  if (item.isAlignmentNode) return "中途对齐";
  return item.phaseName;
}

export function isDelayed(project: {
  status: ProjectStatus;
  deliveryDate?: Date | null;
  startDate?: Date | null;
  targetDeliveryDate?: Date | null;
}): boolean {
  if (
    !project.deliveryDate ||
    project.status === ProjectStatus.WAITING_FEEDBACK ||
    project.status === ProjectStatus.COMPLETED ||
    project.status === ProjectStatus.PAUSED
  ) return false;
  return localDate(project.deliveryDate).getTime() < localDate(new Date()).getTime();
}
