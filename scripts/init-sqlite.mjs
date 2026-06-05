import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statements = [
  `PRAGMA foreign_keys = OFF`,
  `DROP TABLE IF EXISTS "ReminderSendLock"`,
  `DROP TABLE IF EXISTS "Reminder"`,
  `DROP TABLE IF EXISTS "ProjectScheduleItem"`,
  `DROP TABLE IF EXISTS "FeedbackEvent"`,
  `DROP TABLE IF EXISTS "ProjectRound"`,
  `DROP TABLE IF EXISTS "Project"`,
  `DROP TABLE IF EXISTS "Designer"`,
  `DROP TABLE IF EXISTS "Settings"`,
  `PRAGMA foreign_keys = ON`,
  `CREATE TABLE "Designer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isDesignOwner" BOOLEAN NOT NULL DEFAULT false,
    "isDesigner" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX "Designer_name_key" ON "Designer"("name")`,
  `CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "designOwnerId" TEXT,
    "designerIds" TEXT NOT NULL DEFAULT '[]',
    "startDate" DATETIME,
    "targetDeliveryDate" DATETIME,
    "autoDeliveryDate" DATETIME,
    "alignmentDate" DATETIME,
    "deliveryDate" DATETIME,
    "completedAt" DATETIME,
    "scheduleStoppedAt" DATETIME,
    "isUnscheduled" BOOLEAN NOT NULL DEFAULT true,
    "allowReminder" BOOLEAN NOT NULL DEFAULT true,
    "currentRoundIndex" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_designOwnerId_fkey" FOREIGN KEY ("designOwnerId") REFERENCES "Designer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE INDEX "Project_status_idx" ON "Project"("status")`,
  `CREATE INDEX "Project_level_idx" ON "Project"("level")`,
  `CREATE INDEX "Project_division_idx" ON "Project"("division")`,
  `CREATE TABLE "ProjectRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "roundIndex" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "designerIds" TEXT NOT NULL DEFAULT '[]',
    "startDate" DATETIME,
    "targetDeliveryDate" DATETIME,
    "autoDeliveryDate" DATETIME,
    "alignmentDate" DATETIME,
    "deliveryDate" DATETIME,
    "allowReminder" BOOLEAN NOT NULL DEFAULT true,
    "submittedAt" DATETIME,
    "feedbackReceivedAt" DATETIME,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectRound_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX "ProjectRound_projectId_roundIndex_key" ON "ProjectRound"("projectId", "roundIndex")`,
  `CREATE INDEX "ProjectRound_projectId_idx" ON "ProjectRound"("projectId")`,
  `CREATE INDEX "ProjectRound_status_idx" ON "ProjectRound"("status")`,
  `CREATE TABLE "FeedbackEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "roundIndex" INTEGER NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedbackReceivedAt" DATETIME,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FeedbackEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX "FeedbackEvent_projectId_idx" ON "FeedbackEvent"("projectId")`,
  `CREATE TABLE "ProjectScheduleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "roundId" TEXT,
    "roundIndex" INTEGER NOT NULL DEFAULT 1,
    "date" DATETIME NOT NULL,
    "workdayIndex" INTEGER NOT NULL,
    "phaseName" TEXT NOT NULL,
    "isAlignmentNode" BOOLEAN NOT NULL DEFAULT false,
    "isDeliveryNode" BOOLEAN NOT NULL DEFAULT false,
    "designerIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectScheduleItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectScheduleItem_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "ProjectRound" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX "ProjectScheduleItem_date_idx" ON "ProjectScheduleItem"("date")`,
  `CREATE INDEX "ProjectScheduleItem_projectId_idx" ON "ProjectScheduleItem"("projectId")`,
  `CREATE INDEX "ProjectScheduleItem_roundId_idx" ON "ProjectScheduleItem"("roundId")`,
  `CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "roundIndex" INTEGER,
    "type" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "channel" TEXT NOT NULL DEFAULT '企业微信群机器人',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "messageContent" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reminder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX "Reminder_status_idx" ON "Reminder"("status")`,
  `CREATE INDEX "Reminder_scheduledAt_idx" ON "Reminder"("scheduledAt")`,
  `CREATE INDEX "Reminder_projectId_idx" ON "Reminder"("projectId")`,
  `CREATE TABLE "ReminderSendLock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "projectId" TEXT,
    "roundIndex" INTEGER,
    "type" TEXT NOT NULL,
    "scheduledAt" DATETIME,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX "ReminderSendLock_key_key" ON "ReminderSendLock"("key")`,
  `CREATE INDEX "ReminderSendLock_projectId_idx" ON "ReminderSendLock"("projectId")`,
  `CREATE INDEX "ReminderSendLock_type_idx" ON "ReminderSendLock"("type")`,
  `CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "wechatWebhookUrl" TEXT NOT NULL DEFAULT '',
    "workdayRule" TEXT NOT NULL DEFAULT 'MONDAY_TO_FRIDAY',
    "reminderTimes" TEXT NOT NULL DEFAULT '项目创建后立即；对齐前一天；对齐当天上午；交付前一天；交付当天上午；每周一上午',
    "levelRules" TEXT NOT NULL DEFAULT '{"A":8,"B":8,"C":6,"D":2}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`
];

try {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
  console.log("SQLite schema initialized");
} finally {
  await prisma.$disconnect();
}
