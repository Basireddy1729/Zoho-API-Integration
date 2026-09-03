import { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { loadUserAccess } from "../services/rbac.service";
import { verifyToken } from "../utils/jwt";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Verifies the JWT for identity, then reloads roles/permissions fresh from the
 * database on every request. This means a role/permission change by an admin
 * takes effect immediately, instead of waiting for the token to expire.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  try {
    const payload = verifyToken(header.slice("Bearer ".length));

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) {
      res.status(401).json({ error: "Account is inactive or no longer exists" });
      return;
    }

    const access = await loadUserAccess(user.id);
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: access.roles,
      permissions: access.permissions,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
