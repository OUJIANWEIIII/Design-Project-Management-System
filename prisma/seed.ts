import { PrismaClient } from "@prisma/client";
import { enrichProjectForSave, generateProjectSchedule } from "../src/lib/schedule";
import { encodeIds, localDate } from "../src/lib/format";
import { Division, ProjectLevel, ProjectStatus, RequestType } from "../src/lib/enums";

const prisma = new PrismaClient();

async function main() {
  await prisma.reminder.deleteMany();
  await prisma.projectScheduleItem.deleteMany();
  await prisma.feedbackEvent.deleteMany();
  await prisma.projectRound.deleteMany();
  await prisma.project.deleteMany();
  await prisma.designer.deleteMany();
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" }
  });

  const people = await Promise.all([
    person("王经理", true, false),
    person("张三", false, true),
    person("李四", false, true),
    person("王五", false, true),
    person("赵六", false, true),
    person("陈七", true, true),
    person("peter", true, false)
  ]);
  const byName = Object.fromEntries(people.map((item) => [item.name, item.id]));

  await createProject({
    name: "亚马逊冰箱外观优化",
    level: ProjectLevel.A,
    division: Division.AMAZON,
    requestType: RequestType.B2C,
    status: ProjectStatus.WAITING_ALIGNMENT,
    designOwnerId: byName.peter,
    designerIds: [byName["张三"], byName["李四"]],
    startDate: "2026-06-01",
    notes: "重点关注北美厨房场景下的整机识别度。"
  });
  await createProject({
    name: "制冷门体外观优化",
    level: ProjectLevel.C,
    division: Division.REFRIGERATION,
    requestType: RequestType.B2B,
    status: ProjectStatus.IN_PROGRESS,
    designOwnerId: byName.peter,
    designerIds: [byName["李四"], byName["王五"]],
    startDate: "2026-06-01",
    targetDeliveryDate: "2026-06-08"
  });
  await createProject({
    name: "环电空气净化器 CMF 小改",
    level: ProjectLevel.D,
    division: Division.ENVIRONMENT_APPLIANCE,
    requestType: RequestType.B2C,
    status: ProjectStatus.NOT_STARTED,
    designOwnerId: byName.peter,
    designerIds: [byName["张三"]],
    startDate: "2026-06-04"
  });
  await createProject({
    name: "亚马逊新品外观探索",
    level: ProjectLevel.B,
    division: Division.AMAZON,
    requestType: RequestType.B2C,
    status: ProjectStatus.NOT_STARTED,
    designOwnerId: byName.peter,
    designerIds: [],
    notes: "已提前记录，等待业务确认优先级。"
  });
  await createProject({
    name: "制冷展示样机图形更新",
    level: ProjectLevel.D,
    division: Division.REFRIGERATION,
    requestType: RequestType.B2B,
    status: ProjectStatus.COMPLETED,
    designOwnerId: byName.peter,
    designerIds: [byName["赵六"]],
    startDate: "2026-05-25"
  });
  await createProject({
    name: "其它渠道物料造型协助",
    level: ProjectLevel.C,
    division: Division.OTHER,
    requestType: RequestType.B2C,
    status: ProjectStatus.PAUSED,
    designOwnerId: byName.peter,
    designerIds: [byName["王五"]],
    startDate: "2026-05-26",
    targetDeliveryDate: "2026-06-02"
  });
}

async function person(name: string, isDesignOwner: boolean, isDesigner: boolean) {
  return prisma.designer.create({
    data: {
      name,
      role: isDesignOwner ? "设计负责人" : "设计师",
      isDesignOwner,
      isDesigner
    }
  });
}

async function createProject(input: {
  name: string;
  level: ProjectLevel;
  division: Division;
  requestType: RequestType;
  status: ProjectStatus;
  designOwnerId: string;
  designerIds: string[];
  startDate?: string;
  targetDeliveryDate?: string;
  notes?: string;
}) {
  const enriched = enrichProjectForSave({
    ...input,
    startDate: input.startDate ? localDate(input.startDate) : null,
    targetDeliveryDate: input.targetDeliveryDate ? localDate(input.targetDeliveryDate) : null,
    allowReminder: true
  });
  const project = await prisma.project.create({
    data: {
      ...enriched,
      designerIds: encodeIds(input.designerIds)
    }
  });
  const round = await prisma.projectRound.create({
    data: {
      projectId: project.id,
      roundIndex: 1,
      level: project.level,
      status: project.status,
      designerIds: project.designerIds,
      startDate: project.startDate,
      targetDeliveryDate: project.targetDeliveryDate,
      autoDeliveryDate: project.autoDeliveryDate,
      alignmentDate: project.alignmentDate,
      deliveryDate: project.deliveryDate,
      notes: project.notes
    }
  });
  const schedule = generateProjectSchedule({ ...project, level: project.level as ProjectLevel, status: project.status as ProjectStatus, designerIds: input.designerIds });
  await prisma.projectScheduleItem.createMany({
    data: schedule.map((item) => ({ ...item, projectId: project.id, roundId: round.id, roundIndex: 1, designerIds: encodeIds(item.designerIds) }))
  });
}

main().finally(async () => prisma.$disconnect());
