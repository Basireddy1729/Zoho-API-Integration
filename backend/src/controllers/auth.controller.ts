import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { logAudit } from "../services/audit.service";
import { loadUserAccess } from "../services/rbac.service";
import { signToken } from "../utils/jwt";
import { verifyPassword } from "../utils/password";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordValid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordValid || !user.active) {
    await logAudit({
      action: "login_failed",
      details: `email=${email}`,
      ipAddress: req.ip,
    });
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const access = await loadUserAccess(user.id);
  const token = signToken({
    sub: user.id,
    email: user.email,
    roles: access.roles,
    permissions: access.permissions,
  });

  await logAudit({ userId: user.id, action: "login_success", ipAddress: req.ip });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: access.roles,
      permissions: access.permissions,
    },
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  res.json({ user: req.user });
}
