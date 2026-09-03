import { NextFunction, Request, Response } from "express";

/** Requires the authenticated user to hold at least one of the given permission keys. */
export function requirePermission(...permissionKeys: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const hasPermission = permissionKeys.some((key) => user.permissions.includes(key));
    if (!hasPermission) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
}
