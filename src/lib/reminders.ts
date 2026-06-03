import { prisma } from "./prisma";
import { dateTimeAt, decodeIds, formatDate, toISODate } from "./format";
import { divisionLabels, reminderTypeLabels, requestTypeLabels, statusLabels, weekdays } from "./labels";
import { addDays, countWorkdaysBetween, isDelayed, isWorkday, startOfWeek, weekDates } from "./schedule";
import { Division, ProjectStatus, ReminderStatus, ReminderType, RequestType } from "./enums";

export async function rebuildReminderPlan() {
  await cleanupOldReminderRecords();
  await prisma.reminder.deleteMany({ where: { type: { in: [ReminderType.ALIGNMENT_TODAY, ReminderType.DELIVERY_TODAY, ReminderType.UNSCHEDULED_PROJECTS] } } });
  const projects = await prisma.project.findMany({ include: { scheduleItems: true } });
  const designers = await prisma.designer.findMany();
  const namesById = new Map(designers.map((item) => [item.id, item.name]));
  const locked = await prisma.reminder.findMany({ where: { status: { in: [ReminderStatus.SENT, ReminderStatus.REVOKED] } } });
  const failed = await prisma.reminder.findMany({ where: { status: ReminderStatus.FAILED } });
  await prisma.reminder.deleteMany({ where: { status: { notIn: [ReminderStatus.SENT, ReminderStatus.FAILED, ReminderStatus.REVOKED] } } });
  const weekStart = startOfWeek(new Date());
  const planned: Array<{ projectId?: string; roundIndex?: number; type: ReminderType; scheduledAt: Date; messageContent: string }> = [
    {
      type: ReminderType.WEEKLY_SCHEDULE,
      scheduledAt: dateTimeAt(weekStart, 9, 0),
      messageContent: await buildWeeklyMessage(weekStart)
    }
  ];
  for (const project of projects) {
    if (!project.allowReminder) continue;
    planned.push(...buildProjectReminderRows(project, namesById));
  }
  for (const item of planned) {
    const exists = locked.find((old) => old.projectId === ("projectId" in item ? item.projectId : null) && old.type === item.type && old.roundIndex === (item.roundIndex ?? null) && old.scheduledAt.getTime() === item.scheduledAt.getTime());
    if (exists) continue;
    const failedReminder = failed.find((old) => old.projectId === ("projectId" in item ? item.projectId : null) && old.type === item.type && old.roundIndex === (item.roundIndex ?? null) && old.scheduledAt.getTime() === item.scheduledAt.getTime());
    if (failedReminder) {
      await prisma.reminder.update({ where: { id: failedReminder.id }, data: { messageContent: item.messageContent } });
      continue;
    }
    await prisma.reminder.create({ data: { ...item, status: ReminderStatus.PENDING } });
  }
}

export async function createAndSendProjectCreatedReminder(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || !project.allowReminder) return null;
  const designers = await prisma.designer.findMany();
  const namesById = new Map(designers.map((item) => [item.id, item.name]));
  const reminder = await prisma.reminder.create({
    data: {
      projectId: project.id,
      roundIndex: project.currentRoundIndex || 1,
      type: ReminderType.PROJECT_CREATED,
      scheduledAt: new Date(),
      status: ReminderStatus.PENDING,
      messageContent: buildProjectMessage(project, ReminderType.PROJECT_CREATED, namesById)
    }
  });
  return sendReminder(reminder.id);
}

export async function sendDueReminders() {
  const now = new Date();
  const due = await prisma.reminder.findMany({
    where: { status: ReminderStatus.PENDING, scheduledAt: { lte: now } },
    orderBy: { scheduledAt: "asc" }
  });
  const results = [];
  for (const reminder of due) {
    if (reminder.type === ReminderType.WEEKLY_SCHEDULE && !isWeeklyScheduleSendWindow(now)) continue;
    results.push(await sendReminder(reminder.id));
  }
  await cleanupOldReminderRecords(now);
  return results;
}

export async function cleanupOldReminderRecords(now = new Date(), retentionDays = 2) {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  return prisma.reminder.deleteMany({
    where: {
      OR: [
        { status: ReminderStatus.SENT, sentAt: { lt: cutoff } },
        { status: ReminderStatus.SENT, sentAt: null, updatedAt: { lt: cutoff } },
        { status: { in: [ReminderStatus.FAILED, ReminderStatus.REVOKED] }, scheduledAt: { lt: cutoff } }
      ]
    }
  });
}

export function isWeeklyScheduleSendWindow(date: Date) {
  return date.getDay() === 1 && date.getHours() === 9;
}

export async function sendReminder(id: string) {
  const settings = await prisma.settings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
  const reminder = await prisma.reminder.findUnique({ where: { id } });
  if (!reminder) throw new Error("提醒记录不存在");
  if (!settings.wechatWebhookUrl) {
    return prisma.reminder.update({
      where: { id },
      data: { status: ReminderStatus.FAILED, errorMessage: "未配置企业微信群机器人 Webhook。", retryCount: { increment: 1 } }
    });
  }
  if (!isWechatWebhookUrl(settings.wechatWebhookUrl)) {
    return prisma.reminder.update({
      where: { id },
      data: {
        status: ReminderStatus.FAILED,
        errorMessage: "Webhook 地址格式不正确。请填写企业微信群机器人复制出来的发送地址，格式应为 https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...",
        retryCount: { increment: 1 }
      }
    });
  }
  try {
    const response = await fetch(settings.wechatWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgtype: "text", text: { content: reminder.messageContent } })
    });
    const result = await response.json();
    const success = result.errcode === 0;
    return prisma.reminder.update({
      where: { id },
      data: {
        status: success ? ReminderStatus.SENT : ReminderStatus.FAILED,
        sentAt: success ? new Date() : reminder.sentAt,
        errorMessage: success ? "" : JSON.stringify(result),
        retryCount: success ? reminder.retryCount : reminder.retryCount + 1
      }
    });
  } catch (error) {
    return prisma.reminder.update({
      where: { id },
      data: { status: ReminderStatus.FAILED, errorMessage: error instanceof Error ? error.message : "发送失败", retryCount: { increment: 1 } }
    });
  }
}

export async function revokeReminder(id: string) {
  const settings = await prisma.settings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
  const reminder = await prisma.reminder.findUnique({ where: { id } });
  if (!reminder) throw new Error("提醒记录不存在");
  const project = reminder.projectId ? await prisma.project.findUnique({ where: { id: reminder.projectId } }) : null;
  const isSent = reminder.status === ReminderStatus.SENT;
  if (isSent && settings.wechatWebhookUrl && isWechatWebhookUrl(settings.wechatWebhookUrl)) {
    const revokeMessage = [
      "【工业设计提醒作废通知】",
      "",
      "上一条提醒已在系统内标记作废，请以系统最新项目安排为准。",
      `提醒类型：${reminderTypeLabels[reminder.type as ReminderType]}`,
      `项目：${project ? `[${project.level}] ${project.name}` : "全局提醒"}`,
      `原发送时间：${reminder.sentAt ? formatDate(reminder.sentAt) : "-"}`,
      "",
      "说明：企业微信群机器人 Webhook 不支持真正撤回已发送消息，本通知用于群内同步作废。"
    ].join("\n");
    try {
      await fetch(settings.wechatWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ msgtype: "text", text: { content: revokeMessage } })
      });
    } catch {
      // The local record still needs to be marked as revoked even if the follow-up notice fails.
    }
  }
  return prisma.reminder.update({
    where: { id },
    data: {
      status: ReminderStatus.REVOKED,
      errorMessage: isSent ? "已发送作废通知；企业微信群机器人 Webhook 不支持真正撤回原消息。" : "已在系统内作废，未发送到企业微信群。",
      retryCount: reminder.retryCount
    }
  });
}

function isWechatWebhookUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "qyapi.weixin.qq.com" && parsed.pathname === "/cgi-bin/webhook/send" && parsed.searchParams.has("key");
  } catch {
    return false;
  }
}

function buildProjectReminderRows(project: Awaited<ReturnType<typeof prisma.project.findMany>>[number], namesById: Map<string, string>) {
  const roundIndex = project.currentRoundIndex || 1;
  const rows: Array<{ projectId: string; roundIndex: number; type: ReminderType; scheduledAt: Date; messageContent: string }> = [
  ];
  if (project.alignmentDate) {
    rows.push({
      projectId: project.id,
      roundIndex,
      type: ReminderType.ALIGNMENT_BEFORE,
      scheduledAt: dateTimeAt(previousWorkday(project.alignmentDate)),
      messageContent: buildProjectMessage(project, ReminderType.ALIGNMENT_BEFORE, namesById)
    });
  }
  if (project.deliveryDate) {
    rows.push({
      projectId: project.id,
      roundIndex,
      type: ReminderType.DELIVERY_BEFORE,
      scheduledAt: dateTimeAt(previousWorkday(project.deliveryDate)),
      messageContent: buildProjectMessage(project, ReminderType.DELIVERY_BEFORE, namesById)
    });
  }
  if (isDelayed({ status: project.status as ProjectStatus, deliveryDate: project.deliveryDate })) {
    rows.push({
      projectId: project.id,
      roundIndex,
      type: ReminderType.DELAYED,
      scheduledAt: dateTimeAt(new Date()),
      messageContent: buildProjectMessage(project, ReminderType.DELAYED, namesById)
    });
  }
  return rows;
}

function buildProjectMessage(project: Awaited<ReturnType<typeof prisma.project.findMany>>[number], type: ReminderType, namesById: Map<string, string>) {
  const designerIds = decodeIds(project.designerIds);
  const designerNames = designerIds.map((id) => namesById.get(id)).filter(Boolean);
  const ownerName = project.designOwnerId ? namesById.get(project.designOwnerId) || "-" : "-";
  const designerLine = designerNames.length ? designerNames.join("、") : "-";
  const projectLine = `[${project.level}] ${project.name}`;
  const planLine = project.startDate || project.deliveryDate ? `计划：${formatDate(project.startDate)} - ${formatDate(project.deliveryDate)}` : "";
  const missing: string[] = [];
  if (!designerIds.length) missing.push("设计师");
  if (!project.startDate) missing.push("开始时间");

  if (type === ReminderType.PROJECT_CREATED && project.isUnscheduled) {
    return [
      "【新项目待安排】",
      "",
      projectLine,
      `负责人：${ownerName}`,
      `缺少：${missing.length ? missing.join(" / ") : "排期信息"}`,
      "",
      "请确认是否排入本周计划。"
    ].join("\n");
  }

  if (type === ReminderType.PROJECT_CREATED) {
    return [
      "【新项目已录入】",
      "",
      projectLine,
      `负责人：${ownerName}`,
      `设计师：${designerLine}`,
      planLine,
      "",
      "请确认项目已进入排期。"
    ].filter(Boolean).join("\n");
  }

  if (type === ReminderType.DELIVERY_BEFORE) {
    return [
      "【明日交付】",
      "",
      projectLine,
      `设计师：${designerLine}`,
      `交付：${formatDate(project.deliveryDate, "md")}`,
      "",
      "请确认输出文件与交付内容。"
    ].join("\n");
  }

  if (type === ReminderType.ALIGNMENT_BEFORE) {
    return [
      "【明日对齐】",
      "",
      projectLine,
      `负责人：${ownerName}`,
      `设计师：${designerLine}`,
      `对齐：${formatDate(project.alignmentDate, "md")}`,
      "",
      "请准备中途对齐内容。"
    ].join("\n");
  }

  if (type === ReminderType.DELAYED) {
    return [
      "【项目已延期】",
      "",
      projectLine,
      `负责人：${ownerName}`,
      `设计师：${designerLine}`,
      `原交付：${formatDate(project.deliveryDate, "md")}`,
      "当前状态：延期",
      "",
      "请确认继续推进、待反馈或开启下一轮。"
    ].join("\n");
  }

  if (type === ReminderType.WAITING_FEEDBACK) {
    return [
      "【等待反馈】",
      "",
      projectLine,
      `负责人：${ownerName}`,
      `提交时间：${formatDate(new Date(), "md")}`,
      "",
      "请跟进需求方反馈。"
    ].join("\n");
  }

  return [
    `【${reminderTypeLabels[type]}】`,
    "",
    projectLine,
    `负责人：${ownerName}`,
    `设计师：${designerLine}`,
    planLine,
    "",
    "请确认项目推进状态。"
  ].filter(Boolean).join("\n");
}

async function buildWeeklyMessage(weekStart: Date) {
  const dates = weekDates(weekStart);
  const designers = await prisma.designer.findMany({ where: { isDesigner: true, isActive: true } });
  const scheduleRows = await prisma.projectScheduleItem.findMany({
    where: { date: { gte: dates[0], lte: dates[4] } },
    include: { project: true },
    orderBy: [{ date: "asc" }, { roundIndex: "asc" }, { workdayIndex: "asc" }]
  });
  const delayedProjects = await prisma.project.findMany({
    where: {
      isUnscheduled: false,
      status: {
        in: [
          ProjectStatus.DELAYED,
          ProjectStatus.WAITING_FEEDBACK,
          ProjectStatus.COMPLETED,
          ProjectStatus.PAUSED
        ]
      }
    },
    include: { scheduleItems: true }
  });
  const scheduledProjects = await withScheduleStopFields(scheduleRows.map((item) => item.project));
  const scheduledProjectById = new Map(scheduledProjects.map((project) => [project.id, project]));
  const schedule = [
    ...scheduleRows.flatMap((item) => {
      const project = scheduledProjectById.get(item.project.id);
      if (!project) return [];
      if (isStoppedAfterDate(project.status, project.scheduleStoppedAt || project.completedAt, item.date)) return [];
      return [{
        date: item.date,
        designerIds: item.designerIds,
        roundIndex: item.roundIndex,
        workdayIndex: item.workdayIndex,
        phaseName: item.phaseName,
        isAlignmentNode: item.isAlignmentNode,
        isDeliveryNode: item.isDeliveryNode,
        project
      }];
    }),
    ...buildDelayedWeeklyItems(await withScheduleStopFields(delayedProjects), dates)
  ].sort((a, b) => a.date.getTime() - b.date.getTime() || (a.roundIndex || 1) - (b.roundIndex || 1) || a.workdayIndex - b.workdayIndex);
  const lines = ["【本周设计排期】", `${formatDate(dates[0], "md")} - ${formatDate(dates[4], "md")}`, ""];
  let hasDesignerSchedule = false;
  for (const designer of designers) {
    const designerLines: string[] = [];
    lines.push(`${designer.name}：`);
    for (const date of dates) {
      const items = schedule.filter((item) => toISODate(item.date) === toISODate(date) && decodeIds(item.designerIds).includes(designer.id));
      if (!items.length) continue;
      items.forEach((item) => designerLines.push(`${formatDate(date, "md")}：[${item.project.level}] ${item.project.name} / ${weeklyMessageStageLabel(item)}`));
    }
    if (!designerLines.length) {
      lines.pop();
      continue;
    }
    hasDesignerSchedule = true;
    lines.push(...designerLines, "");
  }
  if (!hasDesignerSchedule) lines.push("本周暂无设计排期。", "");
  lines.push(`本周重点：交付 ${countWeeklyItems(schedule, "delivery")} / 延期 ${countWeeklyItems(schedule, "delayed")} / 待反馈 ${countWeeklyItems(schedule, "feedback")}`);
  return lines.join("\n");
}

function countWeeklyItems(schedule: Array<{
  project: { id: string; status: string; scheduleStoppedAt?: string | null; completedAt?: string | null };
  roundIndex: number;
  date: Date;
  phaseName: string;
  isDeliveryNode?: boolean;
}>, kind: "delivery" | "delayed" | "feedback") {
  const keys = new Set<string>();
  schedule.forEach((item) => {
    const label = weeklyMessageStageLabel({
      ...item,
      isAlignmentNode: false,
      workdayIndex: 1
    });
    const matched =
      (kind === "delivery" && item.isDeliveryNode) ||
      (kind === "delayed" && label === "延期") ||
      (kind === "feedback" && label === "待反馈");
    if (matched) keys.add(`${item.project.id}-${item.roundIndex || 1}`);
  });
  return keys.size;
}

type WeeklyProjectWithSchedule = Awaited<ReturnType<typeof prisma.project.findMany>>[number] & {
  completedAt: string | null;
  scheduleStoppedAt: string | null;
  scheduleItems: Array<{ roundIndex: number; date: Date; workdayIndex: number; designerIds: string }>;
};

function isStoppedAfterDate(status: string, stopDate: string | Date | null | undefined, date: Date) {
  const stoppedStatuses = new Set<string>([ProjectStatus.WAITING_FEEDBACK, ProjectStatus.COMPLETED, ProjectStatus.PAUSED]);
  return stoppedStatuses.has(status) && !!stopDate && toISODate(date) > toISODate(stopDate);
}

function weeklyMessageStageLabel(item: {
  isAlignmentNode: boolean;
  isDeliveryNode?: boolean;
  workdayIndex: number;
  phaseName: string;
  date: Date;
  project: { status: string; scheduleStoppedAt?: string | null; completedAt?: string | null };
}) {
  const stoppedStatuses = new Set<string>([ProjectStatus.WAITING_FEEDBACK, ProjectStatus.COMPLETED, ProjectStatus.PAUSED]);
  const stopDate = item.project.scheduleStoppedAt || item.project.completedAt;
  if (stoppedStatuses.has(item.project.status) && stopDate && toISODate(item.date) === toISODate(stopDate)) return statusLabels[item.project.status as ProjectStatus];
  if (item.phaseName === "延期设计推进") return "延期";
  if (item.isDeliveryNode) return "设计交付";
  if (item.isAlignmentNode) return "中途对齐";
  if (item.workdayIndex === 1) return "需求理解";
  return "设计中";
}

function buildDelayedWeeklyItems(projects: WeeklyProjectWithSchedule[], dates: Date[]) {
  const continuingStatuses = new Set<string>([ProjectStatus.DELAYED]);
  const stoppedStatuses = new Set<string>([ProjectStatus.WAITING_FEEDBACK, ProjectStatus.COMPLETED, ProjectStatus.PAUSED]);
  return projects.flatMap((project) => {
    if (!continuingStatuses.has(project.status) && !stoppedStatuses.has(project.status)) return [];
    const stopDate = project.scheduleStoppedAt || project.completedAt;
    const stoppedStatusDate = stopDate ? toISODate(stopDate) : "";
    const roundIndex = project.currentRoundIndex || 1;
    const roundItems = project.scheduleItems
      .filter((item) => (item.roundIndex || 1) === roundIndex)
      .sort((a, b) => a.date.getTime() - b.date.getTime() || a.workdayIndex - b.workdayIndex);
    const lastItem = roundItems[roundItems.length - 1];
    if (!lastItem) return [];
    return dates.flatMap((date) => {
      if (stoppedStatuses.has(project.status) && (!stopDate || toISODate(date) > stoppedStatusDate)) return [];
      if (!isWorkday(date) || toISODate(date) <= toISODate(lastItem.date)) return [];
      const extraWorkdays = countWorkdaysBetween(addDays(lastItem.date, 1), date);
      if (extraWorkdays <= 0) return [];
      return [{
        date,
        designerIds: lastItem.designerIds || project.designerIds,
        roundIndex,
        workdayIndex: lastItem.workdayIndex + extraWorkdays,
        phaseName: stoppedStatuses.has(project.status) && toISODate(date) === stoppedStatusDate ? statusLabels[project.status as ProjectStatus] : "延期设计推进",
        isAlignmentNode: false,
        project
      }];
    });
  });
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

async function buildUnscheduledMessage() {
  const projects = await prisma.project.findMany({ where: { isUnscheduled: true } });
  const lines = ["【工业设计项目待安排提醒】", "", `当前有 ${projects.length} 个项目尚未安排：`, ""];
  projects.forEach((project, index) => {
    lines.push(`${index + 1}. [${project.level}] ${project.name}`);
    lines.push(`事业部：${divisionLabels[project.division as Division]}`);
    lines.push(`需求方：${requestTypeLabels[project.requestType as RequestType]}`);
    lines.push(`目标交付：${project.targetDeliveryDate ? formatDate(project.targetDeliveryDate, "md") : "未填写"}`);
    lines.push(`状态：${statusLabels[project.status as ProjectStatus]}`);
    lines.push("");
  });
  lines.push("请设计负责人确认本周是否需要排入计划。");
  return lines.join("\n");
}

function previousWorkday(date: Date) {
  let cursor = addDays(date, -1);
  while (cursor.getDay() === 0 || cursor.getDay() === 6) cursor = addDays(cursor, -1);
  return cursor;
}
