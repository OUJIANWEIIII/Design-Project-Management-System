import { ProjectStatus } from "./enums";
import { toISODate } from "./format";
import { statusLabels } from "./labels";
import { addDays, countWorkdaysBetween, isWorkday } from "./schedule";

export type WeeklyScheduleItem = {
  id: string;
  roundId?: string | null;
  roundIndex?: number;
  date: Date | string;
  workdayIndex: number;
  phaseName: string;
  isAlignmentNode: boolean;
  isDeliveryNode: boolean;
  designerIds: string[];
};

export type WeeklyProject = {
  id: string;
  status: string;
  isUnscheduled: boolean;
  designerIds: string[];
  currentRoundIndex?: number | null;
  completedAt?: string | Date | null;
  scheduleStoppedAt?: string | Date | null;
  scheduleItems: WeeklyScheduleItem[];
};

const stoppedStatuses = new Set<string>([
  ProjectStatus.WAITING_FEEDBACK,
  ProjectStatus.COMPLETED,
  ProjectStatus.PAUSED
]);

export function isStoppedAfterDate(project: Pick<WeeklyProject, "status" | "completedAt" | "scheduleStoppedAt">, date: string) {
  const stopDate = project.scheduleStoppedAt || project.completedAt;
  return stoppedStatuses.has(project.status) && !!stopDate && date > toISODate(stopDate);
}

export function getWeeklyProjectItemsForDate(project: WeeklyProject, date: string): WeeklyScheduleItem[] {
  const plannedItems = project.scheduleItems.filter((item) => toISODate(item.date) === date);
  const continuationItems = getContinuationItems(project, date);
  if (plannedItems.length) return plannedItems;
  if (isStoppedAfterDate(project, date)) return [];
  return continuationItems;
}

export function weeklyStageLabel(project: Pick<WeeklyProject, "status" | "completedAt" | "scheduleStoppedAt">, item: Pick<WeeklyScheduleItem, "date" | "phaseName" | "isDeliveryNode" | "isAlignmentNode" | "workdayIndex">) {
  const stopDate = project.scheduleStoppedAt || project.completedAt;
  if (stoppedStatuses.has(project.status) && stopDate && toISODate(item.date) === toISODate(stopDate)) return statusLabels[project.status as ProjectStatus];
  if (item.phaseName === "延期设计推进") return "延期";
  if (item.isDeliveryNode) return "设计交付";
  if (item.isAlignmentNode) return "中途对齐";
  if (item.workdayIndex === 1) return "需求理解";
  return "设计中";
}

function getContinuationItems(project: WeeklyProject, date: string): WeeklyScheduleItem[] {
  if (project.isUnscheduled) return [];
  if (!isWorkday(new Date(`${date}T00:00:00`))) return [];
  const historicalItems = getHistoricalRoundContinuationItems(project, date);
  const currentItem = getCurrentRoundContinuationItem(project, date);
  return currentItem ? [...historicalItems, currentItem] : historicalItems;
}

function getHistoricalRoundContinuationItems(project: WeeklyProject, date: string): WeeklyScheduleItem[] {
  const groups = groupScheduleItemsByRound(project.scheduleItems);
  const roundIndexes = [...groups.keys()].sort((a, b) => a - b);
  const items: WeeklyScheduleItem[] = [];

  roundIndexes.forEach((roundIndex, index) => {
    const nextRoundItems = groups.get(roundIndexes[index + 1]);
    if (!nextRoundItems?.length) return;
    const currentRoundItems = groups.get(roundIndex) || [];
    const lastItem = currentRoundItems[currentRoundItems.length - 1];
    const nextFirstItem = nextRoundItems[0];
    if (!lastItem || !nextFirstItem) return;
    if (date <= toISODate(lastItem.date) || date >= toISODate(nextFirstItem.date)) return;
    const extraWorkdays = countWorkdaysBetween(addDays(new Date(`${toISODate(lastItem.date)}T00:00:00`), 1), date);
    if (extraWorkdays <= 0) return;

    items.push({
      id: `${project.id}-round-${roundIndex}-continuation-${date}`,
      roundId: lastItem.roundId,
      roundIndex,
      date,
      workdayIndex: lastItem.workdayIndex + extraWorkdays,
      phaseName: "延期设计推进",
      isAlignmentNode: false,
      isDeliveryNode: false,
      designerIds: lastItem.designerIds.length ? lastItem.designerIds : project.designerIds
    });
  });

  return items;
}

function getCurrentRoundContinuationItem(project: WeeklyProject, date: string): WeeklyScheduleItem | null {
  const continuingStatuses = new Set<string>([ProjectStatus.DELAYED]);
  if (!continuingStatuses.has(project.status) && !stoppedStatuses.has(project.status)) return null;

  const stopDate = project.scheduleStoppedAt || project.completedAt;
  const stoppedStatusDate = stopDate ? toISODate(stopDate) : "";
  if (stoppedStatuses.has(project.status) && (!stopDate || date > stoppedStatusDate)) return null;

  const roundIndex = project.currentRoundIndex || 1;
  const currentRoundItems = project.scheduleItems
    .filter((item) => (item.roundIndex || 1) === roundIndex)
    .sort((a, b) => toISODate(a.date).localeCompare(toISODate(b.date)) || a.workdayIndex - b.workdayIndex);
  const lastItem = currentRoundItems[currentRoundItems.length - 1];
  if (!lastItem || date <= toISODate(lastItem.date)) return null;

  const extraWorkdays = countWorkdaysBetween(addDays(new Date(`${toISODate(lastItem.date)}T00:00:00`), 1), date);
  if (extraWorkdays <= 0) return null;

  return {
    id: `${project.id}-continuation-${date}`,
    roundId: lastItem.roundId,
    roundIndex,
    date,
    workdayIndex: lastItem.workdayIndex + extraWorkdays,
    phaseName: stoppedStatuses.has(project.status) && date === stoppedStatusDate ? statusLabels[project.status as ProjectStatus] : "延期设计推进",
    isAlignmentNode: false,
    isDeliveryNode: false,
    designerIds: lastItem.designerIds.length ? lastItem.designerIds : project.designerIds
  };
}

function groupScheduleItemsByRound(items: WeeklyScheduleItem[]) {
  const groups = new Map<number, WeeklyScheduleItem[]>();
  items.forEach((item) => {
    const roundIndex = item.roundIndex || 1;
    const list = groups.get(roundIndex) || [];
    list.push(item);
    groups.set(roundIndex, list);
  });
  groups.forEach((list) => list.sort((a, b) => toISODate(a.date).localeCompare(toISODate(b.date)) || a.workdayIndex - b.workdayIndex));
  return groups;
}
