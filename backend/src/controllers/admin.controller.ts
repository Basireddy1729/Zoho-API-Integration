import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { logAudit } from "../services/audit.service";
import { hashPassword } from "../utils/password";

// ---- Users ----

export async function listUsers(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    include: { roles: { include: { role: true } } },
    orderBy: { createdAt: "asc" },
  });

  res.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      active: u.active,
      createdAt: u.createdAt,
      roles: u.roles.map((r) => r.role.name),
    })),
  );
}

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  roleIds: z.array(z.string()).default([]),
});

export async function createUser(req: Request, res: Response): Promise<void> {
  const body = createUserSchema.parse(req.body);
  const passwordHash = await hashPassword(body.password);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      passwordHash,
      roles: { create: body.roleIds.map((roleId) => ({ roleId })) },
    },
  });

  await logAudit({
    userId: req.user!.id,
    action: "user_created",
    details: `created user ${user.email}`,
    ipAddress: req.ip,
  });

  res.status(201).json({ id: user.id, email: user.email, name: user.name });
}

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
  roleIds: z.array(z.string()).optional(),
});

export async function updateUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const body = updateUserSchema.parse(req.body);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { name: body.name, active: body.active },
    });

    if (body.roleIds) {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({
        data: body.roleIds.map((roleId) => ({ userId: id, roleId })),
      });
    }
  });

  await logAudit({
    userId: req.user!.id,
    action: "user_updated",
    details: `updated user ${id}`,
    ipAddress: req.ip,
  });

  res.json({ ok: true });
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await prisma.user.delete({ where: { id } });

  await logAudit({
    userId: req.user!.id,
    action: "user_deleted",
    details: `deleted user ${id}`,
    ipAddress: req.ip,
  });

  res.json({ ok: true });
}

// ---- Roles ----

export async function listRoles(_req: Request, res: Response): Promise<void> {
  const roles = await prisma.role.findMany({
    include: { permissions: { include: { permission: true } } },
    orderBy: { name: "asc" },
  });

  res.json(
    roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions.map((p) => p.permission.key),
    })),
  );
}

const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).default([]),
});

export async function createRole(req: Request, res: Response): Promise<void> {
  const body = createRoleSchema.parse(req.body);

  const role = await prisma.role.create({
    data: {
      name: body.name,
      description: body.description,
      permissions: { create: body.permissionIds.map((permissionId) => ({ permissionId })) },
    },
  });

  await logAudit({
    userId: req.user!.id,
    action: "role_created",
    details: `created role ${role.name}`,
    ipAddress: req.ip,
  });

  res.status(201).json({ id: role.id, name: role.name });
}

const updateRoleSchema = z.object({
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

export async function updateRole(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const body = updateRoleSchema.parse(req.body);

  await prisma.$transaction(async (tx) => {
    if (body.description !== undefined) {
      await tx.role.update({ where: { id }, data: { description: body.description } });
    }

    if (body.permissionIds) {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.rolePermission.createMany({
        data: body.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      });
    }
  });

  await logAudit({
    userId: req.user!.id,
    action: "role_updated",
    details: `updated role ${id}`,
    ipAddress: req.ip,
  });

  res.json({ ok: true });
}

export async function deleteRole(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await prisma.role.delete({ where: { id } });

  await logAudit({
    userId: req.user!.id,
    action: "role_deleted",
    details: `deleted role ${id}`,
    ipAddress: req.ip,
  });

  res.json({ ok: true });
}

// ---- Permissions (read-only catalog; seeded, not created via API) ----

export async function listPermissions(_req: Request, res: Response): Promise<void> {
  const permissions = await prisma.permission.findMany({
    include: { zohoApp: true },
    orderBy: { key: "asc" },
  });

  res.json(
    permissions.map((p) => ({
      id: p.id,
      key: p.key,
      description: p.description,
      zohoApp: p.zohoApp ? { key: p.zohoApp.key, name: p.zohoApp.name } : null,
    })),
  );
}

// ---- Audit logs ----

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);

  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  res.json(
    logs.map((l) => ({
      id: l.id,
      action: l.action,
      details: l.details,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
      user: l.user ? { email: l.user.email, name: l.user.name } : null,
    })),
  );
}
