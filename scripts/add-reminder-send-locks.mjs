import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

if (fs.existsSync(".env")) {
  const env = fs.readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of env) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const prisma = new PrismaClient();

const statements = [
  `CREATE TABLE IF NOT EXISTS "ReminderSendLock" (
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
  `CREATE UNIQUE INDEX IF NOT EXISTS "ReminderSendLock_key_key" ON "ReminderSendLock"("key")`,
  `CREATE INDEX IF NOT EXISTS "ReminderSendLock_projectId_idx" ON "ReminderSendLock"("projectId")`,
  `CREATE INDEX IF NOT EXISTS "ReminderSendLock_type_idx" ON "ReminderSendLock"("type")`
];

try {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
  console.log("ReminderSendLock table is ready");
} finally {
  await prisma.$disconnect();
}
