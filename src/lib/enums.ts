export const ProjectStatus = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING_ALIGNMENT: "WAITING_ALIGNMENT",
  WAITING_FEEDBACK: "WAITING_FEEDBACK",
  COMPLETED: "COMPLETED",
  DELAYED: "DELAYED",
  PAUSED: "PAUSED"
} as const;

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const ProjectLevel = {
  A: "A",
  B: "B",
  C: "C",
  D: "D"
} as const;

export type ProjectLevel = (typeof ProjectLevel)[keyof typeof ProjectLevel];

export const Division = {
  REFRIGERATION: "REFRIGERATION",
  ENVIRONMENT_APPLIANCE: "ENVIRONMENT_APPLIANCE",
  AMAZON: "AMAZON",
  OTHER: "OTHER"
} as const;

export type Division = (typeof Division)[keyof typeof Division];

export const RequestType = {
  B2B: "B2B",
  B2C: "B2C",
  BOTH_B2B_B2C: "BOTH_B2B_B2C"
} as const;

export type RequestType = (typeof RequestType)[keyof typeof RequestType];

export const ReminderType = {
  PROJECT_CREATED: "PROJECT_CREATED",
  ALIGNMENT_BEFORE: "ALIGNMENT_BEFORE",
  ALIGNMENT_TODAY: "ALIGNMENT_TODAY",
  DELIVERY_BEFORE: "DELIVERY_BEFORE",
  DELIVERY_TODAY: "DELIVERY_TODAY",
  DELAYED: "DELAYED",
  WAITING_FEEDBACK: "WAITING_FEEDBACK",
  WEEKLY_SCHEDULE: "WEEKLY_SCHEDULE",
  UNSCHEDULED_PROJECTS: "UNSCHEDULED_PROJECTS"
} as const;

export type ReminderType = (typeof ReminderType)[keyof typeof ReminderType];

export const ReminderStatus = {
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED",
  REVOKED: "REVOKED"
} as const;

export type ReminderStatus = (typeof ReminderStatus)[keyof typeof ReminderStatus];
