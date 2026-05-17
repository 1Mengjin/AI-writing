import { prisma } from "@/lib/prisma";

export async function getMorenProject() {
  const user = await prisma.user.upsert({
    where: { email: "local@gongsheng.dev" },
    update: {},
    create: {
      email: "local@gongsheng.dev",
      settings: {},
    },
  });

  return prisma.project.upsert({
    where: { id: "local-project" },
    update: {},
    create: {
      id: "local-project",
      userId: user.id,
      name: "默认项目",
      description: "本地开发用项目",
      settings: {},
    },
  });
}
