export const statusLabels = {
  NOT_STARTED: "未开始",
  IN_PROGRESS: "进行中",
  WAITING_ALIGNMENT: "待对齐",
  WAITING_FEEDBACK: "待反馈",
  COMPLETED: "已完成",
  DELAYED: "已延期",
  PAUSED: "已暂停"
} as const;

export const divisionLabels = {
  REFRIGERATION: "制冷",
  ENVIRONMENT_APPLIANCE: "环电",
  AMAZON: "亚马逊",
  OTHER: "其它"
} as const;

export const requestTypeLabels = {
  B2B: "2B",
  B2C: "2C",
  BOTH_B2B_B2C: "B2C"
} as const;

export const reminderTypeLabels = {
  PROJECT_CREATED: "项目创建提醒",
  ALIGNMENT_BEFORE: "中途对齐前提醒",
  ALIGNMENT_TODAY: "中途对齐提醒",
  DELIVERY_BEFORE: "交付前提醒",
  DELIVERY_TODAY: "交付当天提醒",
  DELAYED: "延期提醒",
  WAITING_FEEDBACK: "待反馈提醒",
  WEEKLY_SCHEDULE: "每周工作安排提醒",
  UNSCHEDULED_PROJECTS: "未安排项目提醒"
} as const;

export const reminderStatusLabels = {
  PENDING: "待发送",
  SENT: "已发送",
  FAILED: "发送失败",
  REVOKED: "已作废"
} as const;

export const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
