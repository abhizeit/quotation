import { prisma } from "./prisma";
import { readSession } from "./session";

export async function getAdmin() {
  const session = await readSession();
  if (!session) return null;
  const user = await prisma.adminUser.findUnique({ where: { id: session.userId } });
  if (!user?.active) return null;
  return user;
}
