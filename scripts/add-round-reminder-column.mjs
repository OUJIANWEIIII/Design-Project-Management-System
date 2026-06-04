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

try {
  await prisma.$executeRawUnsafe("ALTER TABLE ProjectRound ADD COLUMN allowReminder BOOLEAN NOT NULL DEFAULT true");
  console.log("added ProjectRound.allowReminder");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("duplicate column")) {
    console.log("ProjectRound.allowReminder already exists");
  } else {
    throw error;
  }
} finally {
  await prisma.$disconnect();
}
