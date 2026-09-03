import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { logAudit } from "../services/audit.service";
import {
  consumePendingOAuthState,
  createPendingOAuthState,
  exchangeCodeForToken,
  exchangeSelfClientCode,
  getZohoAuthorizationUrl,
  isZohoConnected,
} from "../services/zoho.service";

const ZOHO_SCOPES = [
  "ZohoPeople.employee.READ",
  "ZohoCRM.modules.ALL",
  "Desk.tickets.ALL",
  "ZohoBooks.fullaccess.all",
].join(",");

/**
 * Admin-only: returns the Zoho consent URL for the one-time service-account setup. Returned as
 * JSON (not a redirect) so the frontend's authenticated fetch can call this, then navigate the
 * browser to the URL itself — a plain browser redirect here couldn't carry the auth header.
 */
export async function startZohoOAuth(req: Request, res: Response): Promise<void> {
  const state = createPendingOAuthState(req.user!.id);
  const url = getZohoAuthorizationUrl(ZOHO_SCOPES, state);
  res.json({ url });
}

/** Public callback — Zoho redirects the admin's browser here directly, with no auth header. */
export async function handleZohoOAuthCallback(req: Request, res: Response): Promise<void> {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;

  if (!code || !state) {
    res.status(400).json({ error: "Missing authorization code or state" });
    return;
  }

  const pending = consumePendingOAuthState(state);
  if (!pending) {
    res.status(400).json({ error: "Invalid or expired OAuth state. Please restart the setup from the admin dashboard." });
    return;
  }

  await exchangeCodeForToken(code);
  await logAudit({
    userId: pending.adminUserId,
    action: "zoho_service_account_connected",
    ipAddress: req.ip,
  });

  res.json({ ok: true, message: "Zoho service account connected successfully." });
}

export async function zohoStatus(_req: Request, res: Response): Promise<void> {
  res.json({ connected: await isZohoConnected() });
}

const selfClientSchema = z.object({ code: z.string().min(1) });

/** Admin-only: completes setup using a Zoho "Self Client" grant code pasted from the API Console. */
export async function connectSelfClient(req: Request, res: Response): Promise<void> {
  const { code } = selfClientSchema.parse(req.body);

  await exchangeSelfClientCode(code);
  await logAudit({
    userId: req.user!.id,
    action: "zoho_service_account_connected",
    details: "via self-client grant code",
    ipAddress: req.ip,
  });

  res.json({ ok: true, message: "Zoho service account connected successfully." });
}

/** Returns only the Zoho app tiles the current user is permitted to see. */
export async function listAccessibleApps(req: Request, res: Response): Promise<void> {
  const apps = await prisma.zohoApp.findMany({ include: { permissions: true } });

  const accessible = apps.filter((app) =>
    app.permissions.some((permission) => req.user!.permissions.includes(permission.key)),
  );

  res.json(
    accessible.map((app) => ({
      key: app.key,
      name: app.name,
      description: app.description,
      icon: app.icon,
    })),
  );
}

/** Validates the user's permission for the requested app, logs the access, and hands back the launch URL. */
export async function launchApp(req: Request, res: Response): Promise<void> {
  const { key } = req.params;

  const app = await prisma.zohoApp.findUnique({
    where: { key },
    include: { permissions: true },
  });

  if (!app) {
    res.status(404).json({ error: "Unknown Zoho application" });
    return;
  }

  const permitted = app.permissions.some((permission) => req.user!.permissions.includes(permission.key));
  if (!permitted) {
    await logAudit({
      userId: req.user!.id,
      action: "zoho_app_launch_denied",
      details: `app=${app.key}`,
      ipAddress: req.ip,
    });
    res.status(403).json({ error: "You are not authorized to access this application" });
    return;
  }

  await logAudit({
    userId: req.user!.id,
    action: "zoho_app_launch",
    details: `app=${app.key}`,
    ipAddress: req.ip,
  });

  res.json({ launchUrl: app.launchUrl });
}
