import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json(await prisma.settings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }));
}

export async function PUT(request: Request) {
  const input = await request.json();
  await syncPeople(input.ownerNames || "", input.designerNames || "");
  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    update: {
      wechatWebhookUrl: input.wechatWebhookUrl || "",
      reminderTimes: input.reminderTimes || ""
    },
    create: {
      id: "default",
      wechatWebhookUrl: input.wechatWebhookUrl || "",
      reminderTimes: input.reminderTimes || ""
    }
  });
  return NextResponse.json(settings);
}

function namesFromText(value: string) {
  return value
    .split(/\r?\n|,|，|、/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);
}

async function syncPeople(ownerText: string, designerText: string) {
  const ownerNames = namesFromText(ownerText);
  const designerNames = namesFromText(designerText);
  const allNames = Array.from(new Set([...ownerNames, ...designerNames]));
  const existing = await prisma.designer.findMany();
  const existingByName = new Map(existing.map((item) => [item.name, item]));
  for (const name of allNames) {
    await prisma.designer.upsert({
      where: { name },
      update: {
        isDesignOwner: ownerNames.includes(name),
        isDesigner: designerNames.includes(name),
        isActive: true,
        role: ownerNames.includes(name) ? "设计负责人" : "设计师"
      },
      create: {
        name,
        isDesignOwner: ownerNames.includes(name),
        isDesigner: designerNames.includes(name),
        role: ownerNames.includes(name) ? "设计负责人" : "设计师"
      }
    });
  }
  const keep = new Set(allNames);
  for (const person of existing) {
    if (!keep.has(person.name)) await prisma.designer.update({ where: { id: person.id }, data: { isActive: false } });
  }
  void existingByName;
}
