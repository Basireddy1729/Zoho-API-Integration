import { prisma } from "../db/prisma";

export async function logAudit(params: {
  userId?: string | null;
  action: string;
  details?: string;
  ipAddress?: string | null;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      details: params.details,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
