const STORAGE_KEY = "industrial-design-ops-mvp";

const ProjectStatus = {
  NOT_STARTED: "未开始",
  IN_PROGRESS: "进行中",
  WAITING_ALIGNMENT: "待对齐",
  WAITING_FEEDBACK: "待反馈",
  COMPLETED: "已完成",
  DELAYED: "已延期",
  PAUSED: "已暂停",
};

const STATUS_KEYS = Object.keys(ProjectStatus);
const ProjectLevel = ["A", "B", "C", "D"];
const Divisions = ["制冷", "环电", "亚马逊", "其它"];
const RequestTypes = ["2B", "2C", "B2C"];
const Weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const ReminderTypes = {
  PROJECT_CREATED: "项目创建提醒",
  ALIGNMENT_BEFORE: "中途对齐前提醒",
  ALIGNMENT_TODAY: "中途对齐提醒",
  DELIVERY_BEFORE: "交付前提醒",
  DELIVERY_TODAY: "交付当天提醒",
  DELAYED: "延期提醒",
  WAITING_FEEDBACK: "待反馈提醒",
  WEEKLY_SCHEDULE: "每周工作安排提醒",
  UNSCHEDULED_PROJECTS: "未安排项目提醒",
};

const LevelRules = {
  A: { workdays: 8, alignDay: 3 },
  B: { workdays: 8, alignDay: 3 },
  C: { workdays: 6, alignDay: 3 },
  D: { workdays: 2, alignDay: null },
};

const PhaseRules = {
  A: {
    1: "需求理解与设计准备",
    2: "方案探索与方向形成",
    3: "中途对齐",
    4: "方案调整与方向确认",
    5: "设计深化与输出交付",
    6: "设计深化与输出交付",
    7: "设计深化与输出交付",
    8: "设计深化与输出交付",
  },
  B: {
    1: "需求理解与设计准备",
    2: "方案探索与方向形成",
    3: "中途对齐",
    4: "方案调整与方向确认",
    5: "设计深化与输出交付",
    6: "设计深化与输出交付",
    7: "设计深化与输出交付",
    8: "设计深化与输出交付",
  },
  C: {
    1: "需求理解与设计准备",
    2: "方案设计",
    3: "中途对齐",
    4: "设计深化与输出交付",
    5: "设计深化与输出交付",
    6: "设计深化与输出交付",
  },
  D: {
    1: "需求确认与快速设计",
    2: "修改完善与交付",
  },
};

const defaultState = () => {
  const now = new Date().toISOString();
  return {
    designers: [
      person("d1", "王经理", true, false),
      person("d2", "张三", false, true),
      person("d3", "李四", false, true),
      person("d4", "王五", false, true),
      person("d5", "赵六", false, true),
      person("d6", "陈七", true, true),
    ],
    projects: [
      project({
        id: "p1",
        name: "亚马逊冰箱外观优化",
        level: "A",
        division: "亚马逊",
        requestType: "B2C",
        status: "WAITING_ALIGNMENT",
        designOwnerId: "d1",
        designerIds: ["d2", "d3"],
        startDate: "2026-06-01",
        targetDeliveryDate: "",
        notes: "重点关注北美厨房场景下的整机识别度。",
      }),
      project({
        id: "p2",
        name: "制冷门体外观优化",
        level: "C",
        division: "制冷",
        requestType: "2B",
        status: "IN_PROGRESS",
        designOwnerId: "d1",
        designerIds: ["d3", "d4"],
        startDate: "2026-06-01",
        targetDeliveryDate: "2026-06-08",
      }),
      project({
        id: "p3",
        name: "环电空气净化器 CMF 小改",
        level: "D",
        division: "环电",
        requestType: "2C",
        status: "NOT_STARTED",
        designOwnerId: "d6",
        designerIds: ["d2"],
        startDate: "2026-06-04",
        targetDeliveryDate: "",
      }),
      project({
        id: "p4",
        name: "亚马逊新品外观探索",
        level: "B",
        division: "亚马逊",
        requestType: "B2C",
        status: "NOT_STARTED",
        designOwnerId: "d1",
        designerIds: [],
        startDate: "",
        targetDeliveryDate: "",
        notes: "已提前记录，等待业务确认优先级。",
      }),
      project({
        id: "p5",
        name: "制冷展示样机图形更新",
        level: "D",
        division: "制冷",
        requestType: "2B",
        status: "COMPLETED",
        designOwnerId: "d6",
        designerIds: ["d5"],
        startDate: "2026-05-25",
        targetDeliveryDate: "",
      }),
      project({
        id: "p6",
        name: "其它渠道物料造型协助",
        level: "C",
        division: "其它",
        requestType: "B2C",
        status: "PAUSED",
        designOwnerId: "d1",
        designerIds: ["d4"],
        startDate: "2026-05-26",
        targetDeliveryDate: "2026-06-02",
      }),
    ],
    reminders: [
      reminder("r1", "p1", "中途对齐提醒", "2026-06-03 09:30", "已发送"),
      reminder("r2", "p2", "交付前提醒", "2026-06-05 09:30", "待发送"),
      reminder("r3", "", "每周工作安排提醒", "2026-06-01 09:00", "已发送"),
      reminder("r4", "p4", "未安排项目提醒", "2026-06-01 09:10", "待发送"),
    ],
    settings: {
      wechatWebhookUrl: "",
      workdayRule: "周一至周五，跳过周六和周日",
      reminderTimes: "项目创建后立即；对齐前一天；对齐当天上午；交付前一天；交付当天上午；每周一上午",
      levelRules: "A=8，B=8，C=6，D=2 个工作日",
      updatedAt: now,
    },
    ui: {
      route: "projects",
      selectedProjectId: "p1",
      editingProjectId: null,
      projectFilter: "全部",
      fieldFilters: { level: "", division: "", requestType: "", owner: "", designer: "" },
      weekStart: toISODate(startOfWeek(new Date("2026-06-01"))),
    },
  };
};

function person(id, name, isDesignOwner, isDesigner) {
  const now = new Date().toISOString();
  return { id, name, role: isDesignOwner ? "设计负责人" : "设计师", isDesignOwner, isDesigner, isActive: true, createdAt: now, updatedAt: now };
}

function project(input) {
  const now = new Date().toISOString();
  return {
    id: input.id || uid("p"),
    name: input.name || "",
    level: input.level || "C",
    division: input.division || "制冷",
    requestType: input.requestType || "2B",
    status: input.status || "NOT_STARTED",
    designOwnerId: input.designOwnerId || "",
    designerIds: input.designerIds || [],
    allowReminder: input.allowReminder !== false,
    startDate: input.startDate || "",
    targetDeliveryDate: input.targetDeliveryDate || "",
    autoDeliveryDate: "",
    alignmentDate: "",
    deliveryDate: "",
    isUnscheduled: false,
    notes: input.notes || "",
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
}

function reminder(id, projectId, type, scheduledAt, status) {
  const now = new Date().toISOString();
  return {
    id,
    projectId,
    type,
    scheduledAt,
    sentAt: status === "已发送" ? scheduledAt : "",
    channel: "企业微信群机器人",
    status,
    messageContent: "",
    errorMessage: "",
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

let state = normalizeState(loadState());

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultState();
  } catch {
    return defaultState();
  }
}

function saveState() {
  state = normalizeState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeState(source) {
  const next = { ...defaultState(), ...source };
  next.projects = (source.projects || []).map((item) => enrichProject(item));
  next.reminders = source.reminders || [];
  next.designers = source.designers || [];
  next.settings = { ...defaultState().settings, ...(source.settings || {}) };
  next.ui = { ...defaultState().ui, ...(source.ui || {}) };
  next.ui.fieldFilters = { ...defaultState().ui.fieldFilters, ...(source.ui?.fieldFilters || {}) };
  return next;
}

function enrichProject(item) {
  const next = { ...project(item), ...item };
  next.designerIds = Array.isArray(next.designerIds) ? next.designerIds.slice(0, 4) : [];
  next.isUnscheduled = !next.startDate || next.designerIds.length === 0;
  next.alignmentDate = calculateAlignmentDate(next) || "";
  next.autoDeliveryDate = next.startDate ? addWorkdays(next.startDate, LevelRules[next.level].workdays) : "";
  next.deliveryDate = calculateDeliveryDate(next) || "";
  if (isProjectDelayed(next)) next.status = "DELAYED";
  return next;
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function parseLocalDate(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value, mode = "short") {
  if (!value) return "-";
  const date = parseLocalDate(value);
  if (mode === "md") return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, amount) {
  const next = parseLocalDate(toISODate(date));
  next.setDate(next.getDate() + amount);
  return next;
}

function isWorkday(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function addWorkdays(startDate, workdayCount) {
  let date = parseLocalDate(startDate);
  let added = 0;
  while (added < workdayCount) {
    if (isWorkday(date)) added += 1;
    if (added < workdayCount) date = addDays(date, 1);
  }
  return toISODate(date);
}

function startOfWeek(date) {
  const local = parseLocalDate(toISODate(date));
  const day = local.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(local, diff);
}

function weekDates(weekStartDate) {
  const start = parseLocalDate(weekStartDate);
  return [0, 1, 2, 3, 4].map((offset) => toISODate(addDays(start, offset)));
}

function calculateAlignmentDate(projectItem) {
  if (!projectItem.startDate || projectItem.level === "D") return null;
  return addWorkdays(projectItem.startDate, 3);
}

function calculateDeliveryDate(projectItem) {
  if (!projectItem.startDate) return projectItem.targetDeliveryDate || "";
  if (projectItem.targetDeliveryDate) return projectItem.targetDeliveryDate;
  return addWorkdays(projectItem.startDate, LevelRules[projectItem.level].workdays);
}

function generateProjectSchedule(projectItem) {
  const item = enrichProject(projectItem);
  if (item.isUnscheduled) return [];
  const total = LevelRules[item.level].workdays;
  const dates = [];
  let cursor = parseLocalDate(item.startDate);
  while (dates.length < total) {
    if (isWorkday(cursor)) dates.push(toISODate(cursor));
    cursor = addDays(cursor, 1);
  }
  return dates.map((date, index) => {
    const workdayIndex = index + 1;
    const phaseName = PhaseRules[item.level][workdayIndex];
    return {
      id: `${item.id}_${workdayIndex}`,
      projectId: item.id,
      date,
      workdayIndex,
      phaseName,
      isAlignmentNode: item.level !== "D" && workdayIndex === 3,
      isDeliveryNode: workdayIndex === total,
      designerIds: item.designerIds,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
}

function getProjectPhaseByDate(projectItem, date) {
  const schedule = generateProjectSchedule(projectItem);
  const hit = schedule.find((item) => item.date === date);
  if (!hit) return "";
  if (hit.isDeliveryNode) return "最终交付";
  if (hit.isAlignmentNode) return "中途对齐";
  return hit.phaseName;
}

function calculateDesignerDailyLoad(designerId, date) {
  const count = state.projects
    .filter((item) => !item.isUnscheduled && item.status !== "PAUSED" && item.status !== "COMPLETED")
    .flatMap(generateProjectSchedule)
    .filter((item) => item.date === date && item.designerIds.includes(designerId)).length;
  return { count, percent: count * 100 };
}

function calculateDesignerWeeklyLoad(designerId, weekStartDate) {
  const dates = weekDates(weekStartDate);
  const occupiedDays = dates.reduce((sum, date) => sum + calculateDesignerDailyLoad(designerId, date).count, 0);
  return { occupiedDays, percent: Math.round((occupiedDays / 5) * 100) };
}

function getWeeklyDesignerSchedule(weekStartDate) {
  const dates = weekDates(weekStartDate);
  const activeDesigners = state.designers.filter((person) => person.isDesigner && person.isActive);
  return activeDesigners.map((designer) => {
    const days = Object.fromEntries(
      dates.map((date) => {
        const items = state.projects
          .filter((item) => !item.isUnscheduled && item.status !== "PAUSED")
          .flatMap((projectItem) =>
            generateProjectSchedule(projectItem)
              .filter((scheduleItem) => scheduleItem.date === date && scheduleItem.designerIds.includes(designer.id))
              .map((scheduleItem) => ({ project: projectItem, schedule: scheduleItem }))
          );
        return [date, items];
      })
    );
    return { designer, days, weeklyLoad: calculateDesignerWeeklyLoad(designer.id, weekStartDate) };
  });
}

function detectUnscheduledProjects() {
  return state.projects.filter((item) => item.isUnscheduled);
}

function detectDelayedProjects() {
  return state.projects.filter(isProjectDelayed);
}

function isProjectDelayed(projectItem) {
  if (!projectItem.deliveryDate || projectItem.status === "COMPLETED" || projectItem.status === "PAUSED") return false;
  const today = parseLocalDate(toISODate(new Date()));
  return parseLocalDate(projectItem.deliveryDate) < today;
}

function generateWechatMessage(reminderItem) {
  const projectItem = state.projects.find((item) => item.id === reminderItem.projectId);
  if (reminderItem.type === ReminderTypes.WEEKLY_SCHEDULE) return buildWeeklyMessage(state.ui.weekStart);
  if (reminderItem.type === ReminderTypes.UNSCHEDULED_PROJECTS) return buildUnscheduledMessage();
  if (!projectItem) return "【工业设计提醒】\n暂无关联项目。";
  if (reminderItem.type === ReminderTypes.PROJECT_CREATED) return buildProjectCreatedMessage(projectItem);
  if (reminderItem.type === ReminderTypes.DELAYED) return buildDelayedMessage(projectItem);
  if (reminderItem.type === ReminderTypes.WAITING_FEEDBACK) return buildWaitingFeedbackMessage(projectItem);
  const isDelivery = reminderItem.type.includes("交付");
  const isBefore = reminderItem.type.includes("前");
  return [
    `【工业设计项目${isDelivery ? "交付" : "对齐"}${isBefore ? "前" : ""}提醒】`,
    "",
    `项目：[${projectItem.level}] ${projectItem.name}`,
    `事业部：${projectItem.division}`,
    `需求方：${projectItem.requestType}`,
    `状态：${ProjectStatus[projectItem.status]}`,
    "",
    `设计负责人：${nameOf(projectItem.designOwnerId)}`,
    `设计师：${namesOf(projectItem.designerIds).join("、") || "-"}`,
    "",
    projectItem.alignmentDate ? `对齐时间：${formatDate(projectItem.alignmentDate)}` : "",
    `交付时间：${formatDate(projectItem.deliveryDate)}`,
    "",
    isDelivery ? "请相关设计师确认输出文件与交付内容。" : "请相关设计师准备中途对齐内容。",
  ].filter(Boolean).join("\n");
}

function buildProjectCreatedMessage(projectItem) {
  const reason = projectItem.isUnscheduled ? "当前项目尚未完成安排，请补充设计师和开始时间。" : "项目已进入排期，请相关人员确认工作安排。";
  return [
    "【工业设计项目创建提醒】",
    "",
    `项目：[${projectItem.level}] ${projectItem.name}`,
    `事业部：${projectItem.division}`,
    `需求方：${projectItem.requestType}`,
    `状态：${ProjectStatus[projectItem.status]}`,
    "",
    `设计负责人：${nameOf(projectItem.designOwnerId)}`,
    `设计师：${namesOf(projectItem.designerIds).join("、") || "未安排"}`,
    `开始时间：${formatDate(projectItem.startDate)}`,
    `交付时间：${formatDate(projectItem.deliveryDate)}`,
    "",
    reason,
  ].join("\n");
}

function buildDelayedMessage(projectItem) {
  return [
    "【工业设计项目延期提醒】",
    "",
    `项目：[${projectItem.level}] ${projectItem.name}`,
    `事业部：${projectItem.division}`,
    `需求方：${projectItem.requestType}`,
    `状态：${ProjectStatus[projectItem.status]}`,
    "",
    `设计负责人：${nameOf(projectItem.designOwnerId)}`,
    `设计师：${namesOf(projectItem.designerIds).join("、") || "-"}`,
    `交付时间：${formatDate(projectItem.deliveryDate)}`,
    "",
    "该项目已超过交付时间，请设计负责人确认延期原因与新的推进计划。",
  ].join("\n");
}

function buildWaitingFeedbackMessage(projectItem) {
  return [
    "【工业设计项目待反馈提醒】",
    "",
    `项目：[${projectItem.level}] ${projectItem.name}`,
    `事业部：${projectItem.division}`,
    `需求方：${projectItem.requestType}`,
    "",
    `设计负责人：${nameOf(projectItem.designOwnerId)}`,
    `设计师：${namesOf(projectItem.designerIds).join("、") || "-"}`,
    "",
    "项目当前等待需求方、业务方或客户反馈，请相关负责人跟进反馈闭环。",
  ].join("\n");
}

function buildWeeklyMessage(weekStartDate) {
  const dates = weekDates(weekStartDate);
  const lines = ["【本周工业设计工作安排】", `周期：${formatDate(dates[0])} - ${formatDate(dates[4])}`, ""];
  getWeeklyDesignerSchedule(weekStartDate).forEach((row) => {
    lines.push(`${row.designer.name}：`);
    dates.forEach((date) => {
      const items = row.days[date];
      if (!items.length) return;
      lines.push(`${formatDate(date, "md")} ${Weekdays[parseLocalDate(date).getDay()]}：`);
      items.forEach(({ project, schedule }) => lines.push(`- [${project.level}] ${project.name} / ${schedule.isAlignmentNode ? "待对齐" : schedule.phaseName}`));
    });
    lines.push("");
  });
  const keyNodes = state.projects.flatMap((projectItem) => generateProjectSchedule(projectItem).filter((item) => dates.includes(item.date) && (item.isAlignmentNode || item.isDeliveryNode)).map((item) => ({ project: projectItem, schedule: item })));
  lines.push("本周关键节点：");
  keyNodes.forEach(({ project, schedule }) => lines.push(`- ${formatDate(schedule.date, "md")} [${project.level}] ${project.name}：${schedule.isDeliveryNode ? "交付" : "中途对齐"}`));
  return lines.join("\n");
}

function buildUnscheduledMessage() {
  const items = detectUnscheduledProjects();
  const lines = ["【工业设计项目待安排提醒】", "", `当前有 ${items.length} 个项目尚未安排：`, ""];
  items.forEach((item, index) => {
    const reasons = [!item.designerIds.length ? "未选择设计师" : "", !item.startDate ? "未选择开始时间" : ""].filter(Boolean).join(" / ");
    lines.push(`${index + 1}. [${item.level}] ${item.name}`);
    lines.push(`事业部：${item.division}`);
    lines.push(`需求方：${item.requestType}`);
    lines.push(`目标交付：${item.targetDeliveryDate ? formatDate(item.targetDeliveryDate, "md") : "未填写"}`);
    lines.push(`状态：${ProjectStatus[item.status]}`);
    lines.push(`原因：${reasons}`);
    lines.push("");
  });
  lines.push("请设计负责人确认本周是否需要排入计划。");
  return lines.join("\n");
}

function previousWorkday(dateValue) {
  if (!dateValue) return "";
  let cursor = addDays(parseLocalDate(dateValue), -1);
  while (!isWorkday(cursor)) cursor = addDays(cursor, -1);
  return toISODate(cursor);
}

function nextMonday(dateValue) {
  const base = parseLocalDate(dateValue || toISODate(new Date()));
  const start = startOfWeek(base);
  return toISODate(start);
}

function atMorning(dateValue, time = "09:30") {
  return dateValue ? `${dateValue} ${time}` : "";
}

function createReminder(projectId, type, scheduledAt, status = "待发送") {
  const reminderItem = reminder(uid("r"), projectId, type, scheduledAt, status);
  reminderItem.messageContent = generateWechatMessage(reminderItem);
  return reminderItem;
}

function buildProjectReminders(projectItem) {
  const item = enrichProject(projectItem);
  if (item.allowReminder === false) return [];
  const list = [createReminder(item.id, ReminderTypes.PROJECT_CREATED, atMorning(toISODate(new Date()), "立即"))];
  if (item.status === "WAITING_FEEDBACK") list.push(createReminder(item.id, ReminderTypes.WAITING_FEEDBACK, atMorning(toISODate(new Date()))));
  if (item.isUnscheduled) return list;
  if (item.alignmentDate) {
    list.push(createReminder(item.id, ReminderTypes.ALIGNMENT_BEFORE, atMorning(previousWorkday(item.alignmentDate))));
    list.push(createReminder(item.id, ReminderTypes.ALIGNMENT_TODAY, atMorning(item.alignmentDate)));
  }
  if (item.deliveryDate) {
    list.push(createReminder(item.id, ReminderTypes.DELIVERY_BEFORE, atMorning(previousWorkday(item.deliveryDate))));
    list.push(createReminder(item.id, ReminderTypes.DELIVERY_TODAY, atMorning(item.deliveryDate)));
  }
  if (isProjectDelayed(item)) list.push(createReminder(item.id, ReminderTypes.DELAYED, atMorning(toISODate(new Date()))));
  return list;
}

function rebuildReminderPlan() {
  const weeklyStart = nextMonday(state.ui.weekStart);
  const generated = [
    createReminder("", ReminderTypes.WEEKLY_SCHEDULE, atMorning(weeklyStart, "09:00")),
    createReminder("", ReminderTypes.UNSCHEDULED_PROJECTS, atMorning(weeklyStart, "09:10")),
    ...state.projects.flatMap(buildProjectReminders),
  ];
  const sentHistory = state.reminders.filter((item) => item.status === "已发送");
  state.reminders = mergeReminderHistory(sentHistory, generated);
}

function mergeReminderHistory(history, generated) {
  const keyOf = (item) => `${item.projectId || "global"}|${item.type}|${item.scheduledAt}`;
  const existing = new Map(history.map((item) => [keyOf(item), item]));
  generated.forEach((item) => {
    const old = existing.get(keyOf(item));
    existing.set(keyOf(item), old ? { ...item, ...old, messageContent: old.messageContent || item.messageContent } : item);
  });
  return Array.from(existing.values()).sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)));
}

async function sendWechatReminder(webhookUrl, message) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msgtype: "text", text: { content: message } }),
  });
  return response.json();
}

function nameOf(id) {
  return state.designers.find((person) => person.id === id)?.name || "-";
}

function namesOf(ids) {
  return ids.map(nameOf).filter((name) => name !== "-");
}

function loadLevel(percent) {
  if (percent === 0) return { label: "空闲", tone: "idle" };
  if (percent <= 80) return { label: "有余量", tone: "room" };
  if (percent <= 100) return { label: "正常", tone: "normal" };
  if (percent <= 150) return { label: "偏满", tone: "busy" };
  return { label: "过载", tone: "over" };
}

function filteredProjects() {
  const { projectFilter, fieldFilters } = state.ui;
  const thisWeek = weekDates(state.ui.weekStart);
  return state.projects.filter((item) => {
    const statusName = ProjectStatus[item.status];
    const byQuick =
      projectFilter === "全部" ||
      (projectFilter === "未安排" && item.isUnscheduled) ||
      (projectFilter === "本周交付" && thisWeek.includes(item.deliveryDate)) ||
      projectFilter === statusName;
    const byFields =
      (!fieldFilters.level || item.level === fieldFilters.level) &&
      (!fieldFilters.division || item.division === fieldFilters.division) &&
      (!fieldFilters.requestType || item.requestType === fieldFilters.requestType) &&
      (!fieldFilters.owner || item.designOwnerId === fieldFilters.owner) &&
      (!fieldFilters.designer || item.designerIds.includes(fieldFilters.designer));
    return byQuick && byFields;
  });
}

function stats() {
  const week = weekDates(state.ui.weekStart);
  const byStatus = (status) => state.projects.filter((item) => item.status === status).length;
  return [
    ["全部项目", state.projects.length],
    ["未安排项目", detectUnscheduledProjects().length],
    ["未开始项目", byStatus("NOT_STARTED")],
    ["进行中项目", byStatus("IN_PROGRESS")],
    ["待对齐项目", byStatus("WAITING_ALIGNMENT")],
    ["待反馈项目", byStatus("WAITING_FEEDBACK")],
    ["本周交付项目", state.projects.filter((item) => week.includes(item.deliveryDate)).length],
    ["已完成项目", byStatus("COMPLETED")],
    ["已延期项目", byStatus("DELAYED")],
    ["已暂停项目", byStatus("PAUSED")],
  ];
}

function render() {
  saveState();
  const app = document.querySelector("#app");
  app.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark"></span>
        <div>
          <strong>INDUSTRIAL</strong>
          <small>DESIGN OPS</small>
        </div>
      </div>
      <nav>
        ${navButton("projects", "( 01 ) 项目汇总")}
        ${navButton("week", "( 02 ) 周工作总览")}
        ${navButton("pool", "( 03 ) 项目池")}
        ${navButton("reminders", "( 04 ) 提醒记录")}
        ${navButton("settings", "( 05 ) 基础设置")}
      </nav>
    </aside>
    <main class="shell">
      ${topbar()}
      ${routeContent()}
    </main>
  `;
  bindEvents();
}

function navButton(route, label) {
  return `<button class="nav-item ${state.ui.route === route ? "active" : ""}" data-route="${route}">${label}</button>`;
}

function topbar() {
  const today = new Date();
  const week = weekDates(state.ui.weekStart);
  return `
    <header class="topbar">
      <div>
        <span class="eyebrow">TODAY</span>
        <strong>${formatDate(toISODate(today))}</strong>
        <span class="muted">当前周 ${formatDate(week[0], "md")} - ${formatDate(week[4], "md")}</span>
      </div>
      <div class="top-pills">
        <span>未安排 <b>${detectUnscheduledProjects().length}</b></span>
        <span>本周交付 <b>${state.projects.filter((item) => week.includes(item.deliveryDate)).length}</b></span>
        <span>延期 <b>${detectDelayedProjects().length}</b></span>
      </div>
    </header>
  `;
}

function routeContent() {
  if (state.ui.route === "week") return weekPage();
  if (state.ui.route === "pool") return poolPage();
  if (state.ui.route === "reminders") return remindersPage();
  if (state.ui.route === "settings") return settingsPage();
  if (state.ui.route === "form") return projectFormPage();
  if (state.ui.route === "detail") return projectDetailPage();
  return projectsPage();
}

function projectsPage() {
  return `
    <section class="page-head">
      <div>
        <span class="eyebrow">PROJECTS ( OVERVIEW )</span>
        <h1>项目汇总</h1>
      </div>
      <button class="primary" data-action="new-project">新建项目</button>
    </section>
    <section class="stats-grid">${stats().map(([label, value]) => `<button class="stat-card" data-filter="${label.replace("项目", "").replace("全部", "全部")}"><span>${label}</span><strong>${value}</strong></button>`).join("")}</section>
    ${filters()}
    <section class="panel">
      <div class="panel-title"><span>PROJECT LIST</span><b>${filteredProjects().length}</b></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>项目名称</th><th>等级</th><th>事业部</th><th>需求方</th><th>状态</th><th>设计负责人</th><th>设计师</th><th>开始</th><th>对齐</th><th>交付</th><th>未安排</th><th>操作</th></tr></thead>
          <tbody>${filteredProjects().map(projectRow).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function filters() {
  const designers = state.designers.filter((item) => item.isDesigner);
  const owners = state.designers.filter((item) => item.isDesignOwner);
  const quick = ["全部", "未安排", "未开始", "进行中", "待对齐", "待反馈", "本周交付", "已完成", "已延期", "已暂停"];
  return `
    <section class="filter-bar">
      <div class="segmented">${quick.map((item) => `<button class="${state.ui.projectFilter === item ? "active" : ""}" data-quick-filter="${item}">${item}</button>`).join("")}</div>
      ${select("level-filter", "项目等级", ProjectLevel, state.ui.fieldFilters.level)}
      ${select("division-filter", "事业部", Divisions, state.ui.fieldFilters.division)}
      ${select("request-filter", "需求方", RequestTypes, state.ui.fieldFilters.requestType)}
      ${select("owner-filter", "负责人", owners.map((item) => item.name), nameOf(state.ui.fieldFilters.owner) === "-" ? "" : nameOf(state.ui.fieldFilters.owner))}
      ${select("designer-filter", "设计师", designers.map((item) => item.name), nameOf(state.ui.fieldFilters.designer) === "-" ? "" : nameOf(state.ui.fieldFilters.designer))}
    </section>
  `;
}

function select(id, label, options, value) {
  return `<label class="select-label"><span>${label}</span><select id="${id}"><option value="">全部</option>${options.map((item) => `<option ${item === value ? "selected" : ""}>${item}</option>`).join("")}</select></label>`;
}

function projectRow(item) {
  return `
    <tr>
      <td><button class="link" data-action="detail" data-id="${item.id}">${item.name}</button></td>
      <td><span class="level">[${item.level}]</span></td>
      <td>${item.division}</td>
      <td>${item.requestType}</td>
      <td>${statusBadge(item.status)}</td>
      <td>${nameOf(item.designOwnerId)}</td>
      <td>${namesOf(item.designerIds).join("、") || "-"}</td>
      <td>${formatDate(item.startDate, "md")}</td>
      <td>${formatDate(item.alignmentDate, "md")}</td>
      <td>${formatDate(item.deliveryDate, "md")}</td>
      <td>${item.isUnscheduled ? '<span class="dot-risk"></span>是' : "否"}</td>
      <td class="actions">
        <div class="action-cluster">
          <button data-action="detail" data-id="${item.id}">查看</button>
          <button data-action="edit" data-id="${item.id}">编辑</button>
          <button data-action="complete" data-id="${item.id}">完成</button>
          <button data-action="pause" data-id="${item.id}">暂停</button>
          <button class="danger-action" data-action="delete-project" data-id="${item.id}">删除</button>
        </div>
      </td>
    </tr>
  `;
}

function statusBadge(status) {
  return `<span class="badge badge-${status}">${ProjectStatus[status]}</span>`;
}

function projectFormPage() {
  const editing = state.projects.find((item) => item.id === state.ui.editingProjectId);
  const item = editing || project({});
  const preview = enrichProject(readDraftFromForm(item));
  return `
    <section class="page-head">
      <div>
        <span class="eyebrow">PROJECT ( ${editing ? "EDIT" : "CREATE"} )</span>
        <h1>${editing ? "编辑项目" : "新建项目"}</h1>
      </div>
      <button class="ghost" data-route="projects">返回汇总</button>
    </section>
    <section class="form-layout">
      <form class="panel form-panel" id="project-form">
        ${input("name", "项目名称", item.name, "text", true)}
        <div class="form-grid">
          ${fieldSelect("level", "项目等级", ProjectLevel, item.level)}
          ${fieldSelect("division", "事业部", Divisions, item.division)}
          ${fieldSelect("requestType", "需求方", RequestTypes, item.requestType)}
          ${fieldSelect("status", "项目状态", STATUS_KEYS.map((key) => ProjectStatus[key]), ProjectStatus[item.status])}
        </div>
        ${personSelect("designOwnerId", "设计负责人", state.designers.filter((person) => person.isDesignOwner), item.designOwnerId)}
        <label class="field"><span>设计师（最多 4 人）</span><div class="check-grid">${state.designers.filter((person) => person.isDesigner).map((person) => `<label><input type="checkbox" name="designerIds" value="${person.id}" ${item.designerIds.includes(person.id) ? "checked" : ""}>${person.name}</label>`).join("")}</div></label>
        <label class="field switch-field"><span>项目提醒</span><label><input type="checkbox" name="allowReminder" ${item.allowReminder !== false ? "checked" : ""}> 生成项目提醒计划</label></label>
        <div class="form-grid">${input("startDate", "开始时间", item.startDate, "date", false)}${input("targetDeliveryDate", "目标交付时间", item.targetDeliveryDate, "date", false)}</div>
        <label class="field"><span>项目备注</span><textarea name="notes" rows="4">${item.notes || ""}</textarea></label>
        <div class="form-actions"><button class="primary" type="submit">保存项目</button><button class="ghost" type="button" data-route="projects">取消</button></div>
      </form>
      <aside class="panel preview" id="schedule-preview">
        <div class="panel-title"><span>AUTO SCHEDULE</span><b>[${item.level}]</b></div>
        ${schedulePreview(preview)}
      </aside>
    </section>
  `;
}

function readDraftFromForm(fallback) {
  const form = document.querySelector("#project-form");
  if (!form) return fallback;
  const data = new FormData(form);
  const statusLabel = data.get("status") || ProjectStatus[fallback.status];
  return {
    ...fallback,
    name: data.get("name") || fallback.name,
    level: data.get("level") || fallback.level,
    division: data.get("division") || fallback.division,
    requestType: data.get("requestType") || fallback.requestType,
    status: Object.keys(ProjectStatus).find((key) => ProjectStatus[key] === statusLabel) || fallback.status,
    designOwnerId: data.get("designOwnerId") || fallback.designOwnerId,
    designerIds: data.getAll("designerIds").slice(0, 4),
    startDate: data.get("startDate") || "",
    targetDeliveryDate: data.get("targetDeliveryDate") || "",
    allowReminder: data.get("allowReminder") === "on",
    notes: data.get("notes") || "",
  };
}

function input(name, label, value, type, required) {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${value || ""}" ${required ? "required" : ""}></label>`;
}

function fieldSelect(name, label, options, value) {
  return `<label class="field"><span>${label}</span><select name="${name}">${options.map((option) => `<option ${option === value ? "selected" : ""}>${option}</option>`).join("")}</select></label>`;
}

function personSelect(name, label, people, value) {
  return `<label class="field"><span>${label}</span><select name="${name}" required><option value="">请选择</option>${people.map((person) => `<option value="${person.id}" ${person.id === value ? "selected" : ""}>${person.name}</option>`).join("")}</select></label>`;
}

function schedulePreview(item) {
  const risk = item.targetDeliveryDate && item.autoDeliveryDate && parseLocalDate(item.targetDeliveryDate) < parseLocalDate(item.autoDeliveryDate);
  return `
    <div class="preview-hero">
      <span class="level-big">[${item.level}]</span>
      <strong>${LevelRules[item.level].workdays} WORKDAYS</strong>
      ${item.level !== "D" ? `<p>ALIGN：第 3 个工作日 · ${formatDate(item.alignmentDate, "md")}</p>` : "<p>ALIGN：D 级不强制设置</p>"}
      <p>DELIVERY：第 ${LevelRules[item.level].workdays} 个工作日 · ${formatDate(item.deliveryDate, "md")}</p>
      ${risk ? '<p class="risk">目标交付时间早于默认周期，存在周期不足风险。</p>' : ""}
      ${item.isUnscheduled ? '<p class="risk">未选择设计师或开始时间，保存后进入未安排项目池。</p>' : ""}
    </div>
    <div class="timeline compact">${generateProjectSchedule(item).map(timelineNode).join("") || '<div class="empty">补充设计师和开始时间后生成工作日时间线。</div>'}</div>
  `;
}

function projectDetailPage() {
  const item = state.projects.find((projectItem) => projectItem.id === state.ui.selectedProjectId) || state.projects[0];
  if (!item) return "<section class='panel empty'>暂无项目。</section>";
  return `
    <section class="page-head">
      <div>
        <span class="eyebrow">PROJECT ( DETAIL )</span>
        <h1>[${item.level}] ${item.name}</h1>
      </div>
      <div class="head-actions"><button class="ghost" data-action="edit" data-id="${item.id}">编辑项目</button><button class="ghost" data-route="projects">返回汇总</button></div>
    </section>
    ${item.isUnscheduled ? '<section class="notice">该项目尚未完成安排，请补充设计师和开始时间。<button data-action="edit" data-id="' + item.id + '">立即安排</button></section>' : ""}
    <section class="detail-layout">
      <div class="panel">
        <div class="panel-title"><span>WORKDAY TIMELINE</span><b>${generateProjectSchedule(item).length}</b></div>
        <div class="timeline">${generateProjectSchedule(item).map(timelineNode).join("") || '<div class="empty">未安排项目暂不生成排期。</div>'}</div>
      </div>
      <aside class="panel meta-panel">
        <div class="panel-title"><span>BASIC INFO</span><b>${statusBadge(item.status)}</b></div>
        ${meta("事业部", item.division)}
        ${meta("需求方", item.requestType)}
        ${meta("设计负责人", nameOf(item.designOwnerId))}
        ${meta("设计师", namesOf(item.designerIds).join("、") || "-")}
        ${meta("开始时间", formatDate(item.startDate))}
        ${meta("中途对齐", formatDate(item.alignmentDate))}
        ${meta("交付时间", formatDate(item.deliveryDate))}
        ${meta("目标交付", formatDate(item.targetDeliveryDate))}
        ${meta("是否未安排", item.isUnscheduled ? "是" : "否")}
        ${meta("项目提醒", item.allowReminder === false ? "不提醒" : "提醒")}
        <div class="notes">${item.notes || "暂无备注。"}</div>
        <div class="status-actions">
          ${STATUS_KEYS.map((key) => `<button data-action="set-status" data-status="${key}" data-id="${item.id}" class="${item.status === key ? "active" : ""}">${ProjectStatus[key]}</button>`).join("")}
          <button class="danger-action" data-action="delete-project" data-id="${item.id}">删除项目</button>
        </div>
        <div class="mini-log">
          <strong>提醒记录</strong>
          ${state.reminders.filter((reminderItem) => reminderItem.projectId === item.id).map((reminderItem) => `
            <button data-action="send-reminder" data-id="${reminderItem.id}">
              <span>${reminderItem.type}</span>
              <em>${reminderItem.status}</em>
            </button>
          `).join("") || '<span class="empty-day">暂无关联提醒，前往提醒记录页重建提醒计划。</span>'}
        </div>
      </aside>
    </section>
  `;
}

function timelineNode(node) {
  return `
    <div class="timeline-node ${node.isAlignmentNode ? "align" : ""} ${node.isDeliveryNode ? "delivery" : ""}">
      <div class="node-index">DAY ${String(node.workdayIndex).padStart(2, "0")}</div>
      <div>
        <strong>${node.phaseName}</strong>
        <span>${formatDate(node.date)} ${Weekdays[parseLocalDate(node.date).getDay()]}</span>
      </div>
      <div class="node-tags">${node.isAlignmentNode ? "<em>ALIGN</em>" : ""}${node.isDeliveryNode ? "<em>DELIVERY</em>" : ""}</div>
    </div>
  `;
}

function meta(label, value) {
  return `<div class="meta"><span>${label}</span><strong>${value}</strong></div>`;
}

function weekPage() {
  const dates = weekDates(state.ui.weekStart);
  const rows = getWeeklyDesignerSchedule(state.ui.weekStart);
  const weekProjects = state.projects.filter((item) => generateProjectSchedule(item).some((schedule) => dates.includes(schedule.date)));
  const alignCount = weekProjects.filter((item) => dates.includes(item.alignmentDate)).length;
  const deliveryCount = weekProjects.filter((item) => dates.includes(item.deliveryDate)).length;
  return `
    <section class="page-head">
      <div>
        <span class="eyebrow">WEEK ( VIEW )</span>
        <h1>每周设计师工作总览</h1>
      </div>
      <div class="week-switch">
        <button data-action="week-prev">上一周</button>
        <button data-action="week-today">本周</button>
        <input type="date" id="week-picker" value="${state.ui.weekStart}">
        <button data-action="week-next">下一周</button>
      </div>
    </section>
    <section class="summary-strip">
      <span>本周进行中 <b>${weekProjects.length}</b></span>
      <span>待对齐 <b>${alignCount}</b></span>
      <span>本周交付 <b>${deliveryCount}</b></span>
      <span>未安排 <b>${detectUnscheduledProjects().length}</b></span>
      <span>延期 <b>${detectDelayedProjects().length}</b></span>
    </section>
    <section class="week-board">
      <div class="week-grid week-head">
        <div>设计师</div>
        ${dates.map((date) => `<div>${Weekdays[parseLocalDate(date).getDay()]} ${formatDate(date, "md")}</div>`).join("")}
        <div>本周负载</div>
      </div>
      ${rows.map((row) => weekRow(row, dates)).join("")}
    </section>
  `;
}

function weekRow(row, dates) {
  const load = loadLevel(row.weeklyLoad.percent);
  return `
    <div class="week-grid week-row">
      <div class="designer-cell"><strong>${row.designer.name}</strong><span>${row.designer.isDesignOwner ? "负责人 / 设计师" : "设计师"}</span></div>
      ${dates.map((date) => `<div class="day-cell">${row.days[date].map(projectCard).join("") || '<span class="empty-day">空闲</span>'}</div>`).join("")}
      <div class="load-cell ${load.tone}">
        <strong>${row.weeklyLoad.percent}%</strong>
        <span>${load.label} · ${row.weeklyLoad.occupiedDays}/5</span>
        <div class="loadbar"><i style="width:${Math.min(row.weeklyLoad.percent, 180) / 1.8}%"></i></div>
      </div>
    </div>
  `;
}

function projectCard({ project, schedule }) {
  return `
    <button class="project-card" data-action="detail" data-id="${project.id}">
      <strong>[${project.level}] ${project.name}</strong>
      <span>${project.division} / ${project.requestType}</span>
      <em>DAY ${String(schedule.workdayIndex).padStart(2, "0")} · ${schedule.isDeliveryNode ? "交付" : schedule.isAlignmentNode ? "待对齐" : ProjectStatus[project.status]}</em>
    </button>
  `;
}

function poolPage() {
  const items = detectUnscheduledProjects();
  return `
    <section class="page-head"><div><span class="eyebrow">PROJECT POOL</span><h1>未安排项目池</h1></div><button class="primary" data-action="new-project">新建项目</button></section>
    <section class="pool-grid">${items.map((item) => `
      <article class="pool-card">
        <span class="level">[${item.level}]</span>
        <h3>${item.name}</h3>
        <p>${item.division} / ${item.requestType}</p>
        <p>原因：${!item.designerIds.length ? "未选择设计师 " : ""}${!item.startDate ? "未选择开始时间" : ""}</p>
        <button data-action="edit" data-id="${item.id}">安排项目</button>
      </article>`).join("") || '<div class="panel empty">暂无未安排项目。</div>'}</section>
  `;
}

function remindersPage() {
  return `
    <section class="page-head">
      <div><span class="eyebrow">ALERTS ( LOG )</span><h1>提醒记录</h1></div>
      <div class="head-actions">
        <button class="ghost" data-action="rebuild-reminders">重建提醒计划</button>
        <button class="primary" data-action="send-pending-reminders">发送待发送</button>
      </div>
    </section>
    <section class="summary-strip">
      <span>待发送 <b>${state.reminders.filter((item) => item.status === "待发送").length}</b></span>
      <span>已发送 <b>${state.reminders.filter((item) => item.status === "已发送").length}</b></span>
      <span>发送失败 <b>${state.reminders.filter((item) => item.status === "发送失败").length}</b></span>
      <span>Webhook <b>${state.settings.wechatWebhookUrl ? "已配置" : "未配置"}</b></span>
    </section>
    <section class="panel log-list">
      ${state.reminders.map((item) => {
        const projectItem = state.projects.find((project) => project.id === item.projectId);
        const content = item.messageContent || generateWechatMessage(item);
        return `<article class="log-item">
          <div class="log-main">
            <div>
              <strong>${item.type}</strong>
              <span>${projectItem ? `[${projectItem.level}] ${projectItem.name}` : "全局提醒"}</span>
            </div>
            <b class="send-status ${item.status === "发送失败" ? "fail" : item.status === "已发送" ? "ok" : ""}">${item.status}</b>
          </div>
          <div class="log-meta">
            <span>${item.scheduledAt}</span>
            <span>${item.channel}</span>
            <span>重试 ${item.retryCount || 0} 次</span>
            ${item.sentAt ? `<span>发送：${item.sentAt}</span>` : ""}
            ${item.errorMessage ? `<span class="risk">${item.errorMessage}</span>` : ""}
          </div>
          <pre>${content}</pre>
          <div class="actions log-actions">
            <button data-action="send-reminder" data-id="${item.id}">${item.status === "已发送" ? "再次发送" : "发送"}</button>
            <button data-action="copy-reminder" data-id="${item.id}">复制内容</button>
          </div>
        </article>`;
      }).join("") || '<div class="empty">暂无提醒记录，点击“重建提醒计划”生成。</div>'}
    </section>
  `;
}

function settingsPage() {
  const ownerNames = state.designers.filter((item) => item.isDesignOwner && item.isActive).map((item) => item.name).join("\n");
  const designerNames = state.designers.filter((item) => item.isDesigner && item.isActive).map((item) => item.name).join("\n");
  return `
    <section class="page-head"><div><span class="eyebrow">SETTINGS</span><h1>基础设置</h1></div><button class="ghost" data-action="reset-demo">恢复示例数据</button></section>
    <section class="settings-grid">
      <form class="panel" id="settings-form">
        <div class="panel-title"><span>WECHAT WEBHOOK</span><b>PHASE 2</b></div>
        <label class="field"><span>企业微信群机器人 Webhook</span><input name="wechatWebhookUrl" value="${state.settings.wechatWebhookUrl}" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."></label>
        <div class="form-grid">
          <label class="field"><span>设计负责人名单（每行一个）</span><textarea name="ownerNames" rows="6">${ownerNames}</textarea></label>
          <label class="field"><span>设计师名单（每行一个）</span><textarea name="designerNames" rows="6">${designerNames}</textarea></label>
        </div>
        <label class="field"><span>提醒时间</span><textarea name="reminderTimes" rows="4">${state.settings.reminderTimes}</textarea></label>
        <button class="primary" type="submit">保存设置</button>
      </form>
      <div class="panel">
        <div class="panel-title"><span>BASE DATA</span><b>MVP</b></div>
        ${meta("设计负责人", state.designers.filter((item) => item.isDesignOwner).map((item) => item.name).join("、"))}
        ${meta("设计师", state.designers.filter((item) => item.isDesigner).map((item) => item.name).join("、"))}
        ${meta("事业部", Divisions.join("、"))}
        ${meta("需求方", RequestTypes.join("、"))}
        ${meta("项目等级周期", state.settings.levelRules)}
        ${meta("工作日规则", state.settings.workdayRule)}
      </div>
    </section>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => {
    state.ui.route = button.dataset.route;
    render();
  }));
  document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => handleAction(button)));
  document.querySelectorAll("[data-quick-filter]").forEach((button) => button.addEventListener("click", () => {
    state.ui.projectFilter = button.dataset.quickFilter;
    render();
  }));
  document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
    const map = { 全部: "全部", 未安排: "未安排", 未开始: "未开始", 进行中: "进行中", 待对齐: "待对齐", 待反馈: "待反馈", 本周交付: "本周交付", 已完成: "已完成", 已延期: "已延期", 已暂停: "已暂停" };
    state.ui.projectFilter = map[button.dataset.filter] || "全部";
    render();
  }));
  bindFilter("level-filter", "level", (value) => value);
  bindFilter("division-filter", "division", (value) => value);
  bindFilter("request-filter", "requestType", (value) => value);
  bindFilter("owner-filter", "owner", (value) => state.designers.find((item) => item.name === value)?.id || "");
  bindFilter("designer-filter", "designer", (value) => state.designers.find((item) => item.name === value)?.id || "");
  const form = document.querySelector("#project-form");
  if (form) {
    form.addEventListener("submit", saveProjectFromForm);
    form.addEventListener("change", refreshSchedulePreview);
    form.addEventListener("input", refreshSchedulePreview);
  }
  const settingsForm = document.querySelector("#settings-form");
  if (settingsForm) settingsForm.addEventListener("submit", saveSettings);
  const weekPicker = document.querySelector("#week-picker");
  if (weekPicker) weekPicker.addEventListener("change", (event) => {
    state.ui.weekStart = toISODate(startOfWeek(parseLocalDate(event.target.value)));
    render();
  });
}

function refreshSchedulePreview() {
  const editing = state.projects.find((item) => item.id === state.ui.editingProjectId);
  const fallback = editing || project({});
  const preview = enrichProject(readDraftFromForm(fallback));
  const container = document.querySelector("#schedule-preview");
  if (!container) return;
  container.innerHTML = `<div class="panel-title"><span>AUTO SCHEDULE</span><b>[${preview.level}]</b></div>${schedulePreview(preview)}`;
}

function bindFilter(id, key, transform) {
  const el = document.querySelector(`#${id}`);
  if (!el) return;
  el.addEventListener("change", (event) => {
    state.ui.fieldFilters[key] = transform(event.target.value);
    render();
  });
}

async function handleAction(button) {
  const { action, id, status } = button.dataset;
  if (action === "new-project") {
    state.ui.editingProjectId = null;
    state.ui.route = "form";
  }
  if (action === "detail") {
    state.ui.selectedProjectId = id;
    state.ui.route = "detail";
  }
  if (action === "edit") {
    state.ui.editingProjectId = id;
    state.ui.route = "form";
  }
  if (action === "complete") updateProjectStatus(id, "COMPLETED");
  if (action === "pause") updateProjectStatus(id, "PAUSED");
  if (action === "set-status") updateProjectStatus(id, status);
  if (action === "delete-project") {
    deleteProject(id);
    render();
    return;
  }
  if (action === "week-prev") state.ui.weekStart = toISODate(addDays(parseLocalDate(state.ui.weekStart), -7));
  if (action === "week-next") state.ui.weekStart = toISODate(addDays(parseLocalDate(state.ui.weekStart), 7));
  if (action === "week-today") state.ui.weekStart = toISODate(startOfWeek(new Date()));
  if (action === "rebuild-reminders") rebuildReminderPlan();
  if (action === "send-reminder") {
    await sendReminderRecord(id);
    render();
    return;
  }
  if (action === "send-pending-reminders") {
    await sendPendingReminders();
    render();
    return;
  }
  if (action === "copy-reminder") {
    await copyReminderContent(id);
    render();
    return;
  }
  if (action === "reset-demo") {
    localStorage.removeItem(STORAGE_KEY);
    state = normalizeState(defaultState());
  }
  render();
}

function deleteProject(id) {
  const item = state.projects.find((projectItem) => projectItem.id === id);
  if (!item) return;
  const ok = window.confirm(`确认删除项目「${item.name}」？该操作会同时删除关联提醒记录。`);
  if (!ok) return;
  state.projects = state.projects.filter((projectItem) => projectItem.id !== id);
  state.reminders = state.reminders.filter((reminderItem) => reminderItem.projectId !== id);
  if (state.ui.selectedProjectId === id) state.ui.selectedProjectId = state.projects[0]?.id || "";
  state.ui.route = "projects";
}

async function sendReminderRecord(id) {
  const webhookUrl = state.settings.wechatWebhookUrl;
  state.reminders = await Promise.all(state.reminders.map(async (item) => {
    if (item.id !== id) return item;
    const messageContent = item.messageContent || generateWechatMessage(item);
    if (!webhookUrl) {
      return {
        ...item,
        messageContent,
        status: "发送失败",
        errorMessage: "未配置企业微信群机器人 Webhook。",
        retryCount: (item.retryCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      };
    }
    try {
      const result = await sendWechatReminder(webhookUrl, messageContent);
      const success = result.errcode === 0 || result.code === 0 || result.ok === true;
      return {
        ...item,
        messageContent,
        status: success ? "已发送" : "发送失败",
        sentAt: success ? currentTimestamp() : item.sentAt,
        errorMessage: success ? "" : JSON.stringify(result),
        retryCount: success ? item.retryCount || 0 : (item.retryCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        ...item,
        messageContent,
        status: "发送失败",
        errorMessage: `发送失败：${error.message}。如果浏览器阻止跨域请求，请在第二阶段后端 API 中发送 Webhook。`,
        retryCount: (item.retryCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      };
    }
  }));
}

async function sendPendingReminders() {
  const pendingIds = state.reminders.filter((item) => item.status === "待发送" || item.status === "发送失败").map((item) => item.id);
  for (const id of pendingIds) await sendReminderRecord(id);
}

async function copyReminderContent(id) {
  const item = state.reminders.find((reminderItem) => reminderItem.id === id);
  if (!item) return;
  const content = item.messageContent || generateWechatMessage(item);
  try {
    await navigator.clipboard.writeText(content);
    state.reminders = state.reminders.map((reminderItem) => reminderItem.id === id ? { ...reminderItem, errorMessage: "提醒内容已复制到剪贴板。", updatedAt: new Date().toISOString() } : reminderItem);
  } catch (error) {
    state.reminders = state.reminders.map((reminderItem) => reminderItem.id === id ? { ...reminderItem, errorMessage: `复制失败：${error.message}`, updatedAt: new Date().toISOString() } : reminderItem);
  }
}

function currentTimestamp() {
  const now = new Date();
  return `${toISODate(now)} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function updateProjectStatus(id, status) {
  state.projects = state.projects.map((item) => item.id === id ? enrichProject({ ...item, status, updatedAt: new Date().toISOString() }) : item);
  const changed = state.projects.find((item) => item.id === id);
  if (changed && changed.allowReminder !== false) state.reminders = mergeReminderHistory(state.reminders, buildProjectReminders(changed));
}

function saveProjectFromForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const statusLabel = data.get("status");
  const designerIds = data.getAll("designerIds").slice(0, 4);
  const payload = project({
    id: state.ui.editingProjectId || uid("p"),
    name: data.get("name").trim(),
    level: data.get("level"),
    division: data.get("division"),
    requestType: data.get("requestType"),
    status: Object.keys(ProjectStatus).find((key) => ProjectStatus[key] === statusLabel) || "NOT_STARTED",
    designOwnerId: data.get("designOwnerId"),
    designerIds,
    allowReminder: data.get("allowReminder") === "on",
    startDate: data.get("startDate"),
    targetDeliveryDate: data.get("targetDeliveryDate"),
    notes: data.get("notes"),
    createdAt: state.projects.find((item) => item.id === state.ui.editingProjectId)?.createdAt,
  });
  const saved = enrichProject(payload);
  if (state.ui.editingProjectId) state.projects = state.projects.map((item) => item.id === saved.id ? saved : item);
  else state.projects.unshift(saved);
  state.reminders = state.reminders.filter((item) => item.projectId !== saved.id);
  if (saved.allowReminder !== false) state.reminders = mergeReminderHistory(state.reminders, buildProjectReminders(saved));
  state.ui.selectedProjectId = saved.id;
  state.ui.route = "detail";
  state.ui.editingProjectId = null;
  render();
}

function saveSettings(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.settings.wechatWebhookUrl = data.get("wechatWebhookUrl");
  state.settings.reminderTimes = data.get("reminderTimes");
  syncPeopleFromSettings(data.get("ownerNames"), data.get("designerNames"));
  state.settings.updatedAt = new Date().toISOString();
  render();
}

function namesFromText(value) {
  return String(value || "")
    .split(/\r?\n|,|，|、/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);
}

function syncPeopleFromSettings(ownerText, designerText) {
  const ownerNames = namesFromText(ownerText);
  const designerNames = namesFromText(designerText);
  const allNames = Array.from(new Set([...ownerNames, ...designerNames]));
  const oldByName = new Map(state.designers.map((item) => [item.name, item]));
  state.designers = allNames.map((name) => {
    const old = oldByName.get(name);
    const now = new Date().toISOString();
    return {
      id: old?.id || uid("d"),
      name,
      role: ownerNames.includes(name) ? "设计负责人" : "设计师",
      isDesignOwner: ownerNames.includes(name),
      isDesigner: designerNames.includes(name),
      isActive: true,
      createdAt: old?.createdAt || now,
      updatedAt: now,
    };
  });
  const validIds = new Set(state.designers.map((item) => item.id));
  const firstOwner = state.designers.find((item) => item.isDesignOwner)?.id || "";
  state.projects = state.projects.map((item) => enrichProject({
    ...item,
    designOwnerId: validIds.has(item.designOwnerId) ? item.designOwnerId : firstOwner,
    designerIds: item.designerIds.filter((id) => validIds.has(id)),
  }));
}

render();
