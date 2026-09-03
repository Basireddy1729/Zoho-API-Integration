import { Router } from "express";
import * as zoho from "../controllers/zoho.controller";
import { requireAuth } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";

export const zohoRouter = Router();

// Admin-only one-time OAuth setup for the shared service account.
zohoRouter.get("/oauth/authorize-url", requireAuth, requirePermission("admin:manage_roles"), zoho.startZohoOAuth);
// Public: Zoho redirects the admin's browser here directly (no auth header available). Protected
// by the one-time `state` value minted for that admin's request — see zoho.service.ts.
zohoRouter.get("/oauth/callback", zoho.handleZohoOAuthCallback);
zohoRouter.get("/status", requireAuth, requirePermission("admin:manage_roles"), zoho.zohoStatus);
zohoRouter.post(
  "/oauth/self-client-connect",
  requireAuth,
  requirePermission("admin:manage_roles"),
  zoho.connectSelfClient,
);

// Employee-facing dashboard endpoints.
zohoRouter.get("/apps", requireAuth, zoho.listAccessibleApps);
zohoRouter.post("/apps/:key/launch", requireAuth, zoho.launchApp);
