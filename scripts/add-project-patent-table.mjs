import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "ProjectPatent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "applicationNo" TEXT NOT NULL DEFAULT '',
    "applicationDate" DATETIME,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectPatent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )
`);

await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProjectPatent_status_idx" ON "ProjectPatent"("status")`);

console.log("ProjectPatent table ready");

await prisma.$disconnect();
