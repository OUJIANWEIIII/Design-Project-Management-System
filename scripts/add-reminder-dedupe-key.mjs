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

function localDateKey(value) {
  if (!value) return "NONE";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "NONE";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function reminderDedupeKey(reminder) {
  const projectPart = reminder.projectId || "GLOBAL";
  const roundPart = reminder.roundIndex ?? 0;
  const scheduledPart = reminder.type === "PROJECT_CREATED" ? "ONCE" : localDateKey(reminder.scheduledAt);
  return [projectPart, roundPart, reminder.type, scheduledPart].join("|");
}

async function hasColumn(table, column) {
  const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
  return rows.some((row) => row.name === column);
}

try {
  if (!await hasColumn("Reminder", "dedupeKey")) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Reminder" ADD COLUMN "dedupeKey" TEXT`);
    console.log("added Reminder.dedupeKey");
  } else {
    console.log("Reminder.dedupeKey already exists");
  }

  const reminders = await prisma.$queryRawUnsafe(
    `SELECT "id", "projectId", "roundIndex", "type", "scheduledAt", "dedupeKey" FROM "Reminder" ORDER BY "scheduledAt" ASC`
  );
  const usedKeys = new Set();

  for (const reminder of reminders) {
    const baseKey = reminder.dedupeKey || reminderDedupeKey(reminder);
    const key = usedKeys.has(baseKey) ? `${baseKey}|DUP|${reminder.id}` : baseKey;
    usedKeys.add(key);
    await prisma.reminder.update({ where: { id: reminder.id }, data: { dedupeKey: key } });
  }

  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Reminder_dedupeKey_key" ON "Reminder"("dedupeKey")`);
  console.log(`updated ${reminders.length} reminder dedupe keys`);
} finally {
  await prisma.$disconnect();
}
