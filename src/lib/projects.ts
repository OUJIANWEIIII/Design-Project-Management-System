import { Prisma } from "@prisma/client";
import { Division, ProjectLevel, ProjectStatus, RequestType } from "./enums";
import { prisma } from "./prisma";
import { decodeIds, encodeIds, localDate } from "./format";
import { enrichProjectForSave, generateProjectSchedule } from "./schedule";
import { createAndSendProjectCreatedReminder, rebuildReminderPlan } from "./reminders";

const continuingStatuses = new Set<ProjectStatus>([
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.DELAYED
]);

const stoppedButHistoricalStatuses = new Set<ProjectStatus>([
  ProjectStatus.WAITING_ALIGNMENT,
  ProjectStatus.WAITING_FEEDBACK,
  ProjectStatus.COMPLETED,
  ProjectStatus.PAUSED
]);

export type ProjectInput = {
  name: string;
  level: ProjectLevel;
  division: Division;
  requestType: RequestType;
  status: ProjectStatus;
  designOwnerId?: string | null;
  designerIds: string[];
  startDate?: string | null;
  targetDeliveryDate?: string | null;
  allowReminder?: boolean;
  notes?: string;
};

export type ProjectRoundInput = {
  level: ProjectLevel;
  status?: ProjectStatus;
  designerIds: string[];
  startDate?: string | null;
  targetDeliveryDate?: string | null;
  allowReminder?: boolean;
  notes?: string;
};

export async function listProjects() {
  const projects = await prisma.project.findMany({
    include: {
      scheduleItems: { orderBy: [{ roundIndex: "asc" }, { workdayIndex: "asc" }] },
      rounds: { orderBy: { roundIndex: "asc" } },
      feedbackEvents: { orderBy: { submittedAt: "asc" } },
      reminders: { orderBy: { scheduledAt: "asc" } }
    },
    orderBy: { createdAt: "desc" }
  });
  return withScheduleStopFields(projects.map(serializeProject));
}

export async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      scheduleItems: { orderBy: [{ roundIndex: "asc" }, { workdayIndex: "asc" }] },
      rounds: { orderBy: { roundIndex: "asc" } },
      feedbackEvents: { orderBy: { submittedAt: "asc" } },
      reminders: { orderBy: { scheduledAt: "asc" } }
    }
  });
  if (!project) return null;
  const [serialized] = await withScheduleStopFields([serializeProject(project)]);
  return serialized;
}

export async function createProject(input: ProjectInput) {
  const data = projectData(input);
  const project = await prisma.project.create({ data });
  const round = await upsertRound(project.id, 1, {
    level: project.level as ProjectLevel,
    status: project.status as ProjectStatus,
    designerIds: input.designerIds,
    startDate: input.startDate,
    targetDeliveryDate: input.targetDeliveryDate,
    allowReminder: input.allowReminder,
    notes: input.notes
  });
  await rebuildSchedule(project.id, { ...project, level: project.level as ProjectLevel, status: project.status as ProjectStatus, designerIds: input.designerIds }, round.id, 1);
  await rebuildReminderPlan();
  await createAndSendProjectCreatedReminder(project.id);
  return getProject(project.id);
}

export async function updateProject(id: string, input: ProjectInput) {
  const current = await prisma.project.findUnique({ where: { id } });
  const data = projectData(input);
  const wasUnscheduled = !current?.startDate || decodeIds(current.designerIds).length === 0;
  const wasReminderEnabled = current?.allowReminder === true;
  const project = await prisma.project.update({ where: { id }, data });
  const shouldSendArrangementReminder =
    project.allowReminder &&
    ((!wasReminderEnabled && !project.isUnscheduled) || (wasUnscheduled && !project.isUnscheduled));
  await syncScheduleStopFields(project.id, current?.status as ProjectStatus | undefined, project.status as ProjectStatus);
  const roundIndex = project.currentRoundIndex || 1;
  const round = await upsertRound(project.id, roundIndex, {
    level: project.level as ProjectLevel,
    status: project.status as ProjectStatus,
    designerIds: input.designerIds,
    startDate: input.startDate,
    targetDeliveryDate: input.targetDeliveryDate,
    allowReminder: input.allowReminder,
    notes: input.notes
  });
  await rebuildSchedule(project.id, { ...project, level: project.level as ProjectLevel, status: project.status as ProjectStatus, designerIds: input.designerIds }, round.id, roundIndex);
  if (!project.allowReminder) await prisma.reminder.deleteMany({ where: { projectId: id } });
  else await rebuildReminderPlan();
  if (shouldSendArrangementReminder) {
    await createAndSendProjectCreatedReminder(project.id, (project.currentRoundIndex || 1) > 1 ? "新一轮设计开始" : "项目已安排");
  }
  return getProject(project.id);
}

export async function deleteProject(id: string) {
  await prisma.project.delete({ where: { id } });
}

export async function updateProjectStatus(id: string, status: ProjectStatus) {
  const current = await prisma.project.findUnique({ where: { id } });
  if (!current) return null;
  const designerIds = decodeIds(current.designerIds);
  const enriched = enrichProjectForSave({ ...current, level: current.level as ProjectLevel, status, designerIds });
  const now = new Date();
  const existingCompletedAt = await getCompletedAt(id);
  await prisma.$executeRawUnsafe(
    `UPDATE "Project" SET "status" = ?, "completedAt" = ?, "scheduleStoppedAt" = ?, "updatedAt" = ? WHERE "id" = ?`,
    enriched.status,
    enriched.status === ProjectStatus.COMPLETED ? existingCompletedAt || now.toISOString() : null,
    resolveScheduleStoppedAt(current.status as ProjectStatus, enriched.status, await getScheduleStoppedAt(id), now),
    now.toISOString(),
    id
  );
  return getProject(id);
}

export async function submitProjectForFeedback(id: string, notes = "") {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return null;
  const roundIndex = project.currentRoundIndex || 1;
  const now = new Date();
  const openFeedback = await prisma.feedbackEvent.findFirst({
    where: { projectId: id, roundIndex, feedbackReceivedAt: null },
    orderBy: { submittedAt: "desc" }
  });
  if (openFeedback) {
    await prisma.feedbackEvent.update({ where: { id: openFeedback.id }, data: { submittedAt: now, notes } });
  } else {
    await prisma.feedbackEvent.create({ data: { projectId: id, roundIndex, submittedAt: now, notes } });
  }
  await prisma.projectRound.updateMany({ where: { projectId: id, roundIndex }, data: { status: ProjectStatus.WAITING_FEEDBACK, submittedAt: now } });
  await prisma.$executeRawUnsafe(
    `UPDATE "Project" SET "status" = ?, "scheduleStoppedAt" = ?, "updatedAt" = ? WHERE "id" = ?`,
    ProjectStatus.WAITING_FEEDBACK,
    now.toISOString(),
    now.toISOString(),
    id
  );
  await rebuildReminderPlan();
  return getProject(id);
}

export async function createNextRound(projectId: string, input: ProjectRoundInput) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { rounds: true } });
  if (!project) return null;
  const nextIndex = Math.max(0, ...project.rounds.map((round) => round.roundIndex)) + 1;
  const enriched = enrichProjectForSave({
    ...input,
    status: input.status ?? ProjectStatus.IN_PROGRESS,
    startDate: input.startDate ? localDate(input.startDate) : null,
    targetDeliveryDate: input.targetDeliveryDate ? localDate(input.targetDeliveryDate) : null,
    designerIds: input.designerIds.slice(0, 4)
  });
  const round = await prisma.projectRound.create({
    data: {
      projectId,
      roundIndex: nextIndex,
      level: input.level,
      status: enriched.status,
      designerIds: encodeIds(input.designerIds.slice(0, 4)),
      startDate: enriched.startDate,
      targetDeliveryDate: enriched.targetDeliveryDate,
      autoDeliveryDate: enriched.autoDeliveryDate,
      alignmentDate: enriched.alignmentDate,
      deliveryDate: enriched.deliveryDate,
      allowReminder: input.allowReminder ?? project.allowReminder,
      notes: input.notes || ""
    }
  });
  await prisma.project.update({
    where: { id: projectId },
    data: {
      currentRoundIndex: nextIndex,
      level: input.level,
      status: enriched.status,
      designerIds: encodeIds(input.designerIds.slice(0, 4)),
      startDate: project.startDate || enriched.startDate,
      targetDeliveryDate: enriched.targetDeliveryDate,
      autoDeliveryDate: enriched.autoDeliveryDate,
      alignmentDate: enriched.alignmentDate,
      deliveryDate: enriched.deliveryDate,
      isUnscheduled: enriched.isUnscheduled
    }
  });
  await clearScheduleStopFields(projectId);
  await rebuildSchedule(projectId, { ...enriched, level: input.level, designerIds: input.designerIds.slice(0, 4) }, round.id, nextIndex);
  await rebuildReminderPlan();
  await createAndSendProjectCreatedReminder(projectId, "新一轮设计开始");
  return getProject(projectId);
}

export async function updateProjectRound(projectId: string, roundIndex: number, input: ProjectRoundInput) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { rounds: true } });
  if (!project) return null;
  const existingRound = project.rounds.find((round) => round.roundIndex === roundIndex);
  if (!existingRound) return null;
  const designerIds = input.designerIds.slice(0, 4);
  const enriched = enrichProjectForSave({
    ...input,
    status: input.status ?? (existingRound.status as ProjectStatus),
    startDate: input.startDate ? localDate(input.startDate) : null,
    targetDeliveryDate: input.targetDeliveryDate ? localDate(input.targetDeliveryDate) : null,
    designerIds
  });
  const round = await prisma.projectRound.update({
    where: { projectId_roundIndex: { projectId, roundIndex } },
    data: {
      level: input.level,
      status: enriched.status,
      designerIds: encodeIds(designerIds),
      startDate: enriched.startDate,
      targetDeliveryDate: enriched.targetDeliveryDate,
      autoDeliveryDate: enriched.autoDeliveryDate,
      alignmentDate: enriched.alignmentDate,
      deliveryDate: enriched.deliveryDate,
      allowReminder: input.allowReminder ?? existingRound.allowReminder,
      notes: input.notes || ""
    }
  });
  if ((project.currentRoundIndex || 1) === roundIndex) {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        level: input.level,
        status: enriched.status,
        designerIds: encodeIds(designerIds),
        targetDeliveryDate: enriched.targetDeliveryDate,
        autoDeliveryDate: enriched.autoDeliveryDate,
        alignmentDate: enriched.alignmentDate,
        deliveryDate: enriched.deliveryDate,
        isUnscheduled: enriched.isUnscheduled
      }
    });
    await syncScheduleStopFields(projectId, project.status as ProjectStatus, enriched.status);
  }
  await rebuildSchedule(projectId, { ...enriched, level: input.level, designerIds }, round.id, roundIndex);
  await rebuildReminderPlan();
  if ((project.currentRoundIndex || 1) === roundIndex && existingRound.allowReminder === false && round.allowReminder && !enriched.isUnscheduled) {
    await createAndSendProjectCreatedReminder(projectId, roundIndex > 1 ? "新一轮设计开始" : "项目已安排");
  }
  return getProject(projectId);
}

export async function deleteProjectRound(projectId: string, roundIndex: number) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { rounds: true } });
  if (!project) return { ok: false as const, status: 404, error: "Project not found" };
  const existingRound = project.rounds.find((round) => round.roundIndex === roundIndex);
  if (!existingRound) return { ok: false as const, status: 404, error: "Project round not found" };
  if (project.rounds.length <= 1) return { ok: false as const, status: 400, error: "Cannot delete the only round" };

  await prisma.projectScheduleItem.deleteMany({ where: { projectId, roundIndex } });
  await prisma.projectRound.delete({ where: { projectId_roundIndex: { projectId, roundIndex } } });
  const remainingRounds = project.rounds
    .filter((round) => round.roundIndex !== roundIndex)
    .sort((a, b) => a.roundIndex - b.roundIndex);

  if ((project.currentRoundIndex || 1) === roundIndex) {
    const nextCurrent = remainingRounds[remainingRounds.length - 1];
    const designerIds = decodeIds(nextCurrent.designerIds);
    await prisma.project.update({
      where: { id: projectId },
      data: {
        currentRoundIndex: nextCurrent.roundIndex,
        level: nextCurrent.level,
        status: nextCurrent.status,
        designerIds: nextCurrent.designerIds,
        targetDeliveryDate: nextCurrent.targetDeliveryDate,
        autoDeliveryDate: nextCurrent.autoDeliveryDate,
        alignmentDate: nextCurrent.alignmentDate,
        deliveryDate: nextCurrent.deliveryDate,
        isUnscheduled: !nextCurrent.startDate || designerIds.length === 0
      }
    });
    await syncScheduleStopFields(projectId, project.status as ProjectStatus, nextCurrent.status as ProjectStatus);
  }

  await rebuildReminderPlan();
  return { ok: true as const, project: await getProject(projectId) };
}

function projectData(input: ProjectInput): Prisma.ProjectUncheckedCreateInput {
  const enriched = enrichProjectForSave({
    ...input,
    status: input.status ?? ProjectStatus.NOT_STARTED,
    startDate: input.startDate ? localDate(input.startDate) : null,
    targetDeliveryDate: input.targetDeliveryDate ? localDate(input.targetDeliveryDate) : null,
    designerIds: input.designerIds.slice(0, 4)
  });
  return {
    name: input.name,
    level: input.level,
    division: input.division,
    requestType: input.requestType,
    status: enriched.status,
    designOwnerId: input.designOwnerId || null,
    designerIds: encodeIds(input.designerIds.slice(0, 4)),
    startDate: enriched.startDate,
    targetDeliveryDate: enriched.targetDeliveryDate,
    autoDeliveryDate: enriched.autoDeliveryDate,
    alignmentDate: enriched.alignmentDate,
    deliveryDate: enriched.deliveryDate,
    isUnscheduled: enriched.isUnscheduled,
    allowReminder: input.allowReminder !== false,
    notes: input.notes || ""
  };
}

async function upsertRound(projectId: string, roundIndex: number, input: ProjectRoundInput) {
  const enriched = enrichProjectForSave({
    ...input,
    status: input.status ?? ProjectStatus.NOT_STARTED,
    startDate: input.startDate ? localDate(input.startDate) : null,
    targetDeliveryDate: input.targetDeliveryDate ? localDate(input.targetDeliveryDate) : null,
    designerIds: input.designerIds.slice(0, 4)
  });
  return prisma.projectRound.upsert({
    where: { projectId_roundIndex: { projectId, roundIndex } },
    update: {
      level: input.level,
      status: enriched.status,
      designerIds: encodeIds(input.designerIds.slice(0, 4)),
      startDate: enriched.startDate,
      targetDeliveryDate: enriched.targetDeliveryDate,
      autoDeliveryDate: enriched.autoDeliveryDate,
      alignmentDate: enriched.alignmentDate,
      deliveryDate: enriched.deliveryDate,
      allowReminder: input.allowReminder !== false,
      notes: input.notes || ""
    },
    create: {
      projectId,
      roundIndex,
      level: input.level,
      status: enriched.status,
      designerIds: encodeIds(input.designerIds.slice(0, 4)),
      startDate: enriched.startDate,
      targetDeliveryDate: enriched.targetDeliveryDate,
      autoDeliveryDate: enriched.autoDeliveryDate,
      alignmentDate: enriched.alignmentDate,
      deliveryDate: enriched.deliveryDate,
      allowReminder: input.allowReminder !== false,
      notes: input.notes || ""
    }
  });
}

async function rebuildSchedule(projectId: string, project: Parameters<typeof generateProjectSchedule>[0], roundId: string, roundIndex: number) {
  await prisma.projectScheduleItem.deleteMany({ where: { projectId, roundIndex } });
  const schedule = generateProjectSchedule(project);
  if (!schedule.length) return;
  await prisma.projectScheduleItem.createMany({
    data: schedule.map((item) => ({
      projectId,
      roundId,
      roundIndex,
      date: item.date,
      workdayIndex: item.workdayIndex,
      phaseName: item.phaseName,
      isAlignmentNode: item.isAlignmentNode,
      isDeliveryNode: item.isDeliveryNode,
      designerIds: encodeIds(item.designerIds)
    }))
  });
}

export function serializeProject<T extends {
  id: string;
  designerIds: string;
  scheduleItems?: { designerIds: string }[];
  rounds?: { designerIds: string }[];
}>(project: T) {
  return {
    ...project,
    designerIds: decodeIds(project.designerIds),
    scheduleItems: project.scheduleItems?.map((item) => ({ ...item, designerIds: decodeIds(item.designerIds) })) ?? [],
    rounds: project.rounds?.map((round) => ({ ...round, designerIds: decodeIds(round.designerIds) })) ?? []
  };
}

async function withScheduleStopFields<T extends { id: string }>(projects: T[]) {
  if (!projects.length) return projects.map((project) => ({ ...project, completedAt: null as string | null, scheduleStoppedAt: null as string | null }));
  const placeholders = projects.map(() => "?").join(",");
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; completedAt: string | null; scheduleStoppedAt: string | null }>>(
    `SELECT "id", "completedAt", "scheduleStoppedAt" FROM "Project" WHERE "id" IN (${placeholders})`,
    ...projects.map((project) => project.id)
  );
  const fieldsById = new Map(rows.map((row) => [row.id, row]));
  return projects.map((project) => {
    const fields = fieldsById.get(project.id);
    return {
      ...project,
      completedAt: fields?.completedAt ?? null,
      scheduleStoppedAt: fields?.scheduleStoppedAt ?? null
    };
  });
}

async function getCompletedAt(id: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ completedAt: string | null }>>(
    `SELECT "completedAt" FROM "Project" WHERE "id" = ?`,
    id
  );
  return rows[0]?.completedAt ?? null;
}

async function getScheduleStoppedAt(id: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ scheduleStoppedAt: string | null }>>(
    `SELECT "scheduleStoppedAt" FROM "Project" WHERE "id" = ?`,
    id
  );
  return rows[0]?.scheduleStoppedAt ?? null;
}

function resolveScheduleStoppedAt(previousStatus: ProjectStatus | undefined, nextStatus: ProjectStatus, existingStoppedAt: string | null, now: Date) {
  if (continuingStatuses.has(nextStatus)) return null;
  if (stoppedButHistoricalStatuses.has(nextStatus)) return existingStoppedAt || now.toISOString();
  return null;
}

async function syncScheduleStopFields(id: string, previousStatus: ProjectStatus | undefined, nextStatus: ProjectStatus) {
  const now = new Date();
  const existingCompletedAt = await getCompletedAt(id);
  const existingStoppedAt = await getScheduleStoppedAt(id);
  await prisma.$executeRawUnsafe(
    `UPDATE "Project" SET "completedAt" = ?, "scheduleStoppedAt" = ?, "updatedAt" = ? WHERE "id" = ?`,
    nextStatus === ProjectStatus.COMPLETED ? existingCompletedAt || now.toISOString() : null,
    resolveScheduleStoppedAt(previousStatus, nextStatus, existingStoppedAt, now),
    now.toISOString(),
    id
  );
}

async function clearScheduleStopFields(id: string) {
  const now = new Date();
  await prisma.$executeRawUnsafe(
    `UPDATE "Project" SET "completedAt" = NULL, "scheduleStoppedAt" = NULL, "updatedAt" = ? WHERE "id" = ?`,
    now.toISOString(),
    id
  );
}
