import { Router } from "express";
import * as admin from "../controllers/admin.controller";
import { requireAuth } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";

export const adminRouter = Router();

adminRouter.use(requireAuth);

const manageUsers = requirePermission("admin:manage_users");
const manageRoles = requirePermission("admin:manage_roles");
const viewAuditLogs = requirePermission("admin:view_audit_logs");

adminRouter.get("/users", manageUsers, admin.listUsers);
adminRouter.post("/users", manageUsers, admin.createUser);
adminRouter.patch("/users/:id", manageUsers, admin.updateUser);
adminRouter.delete("/users/:id", manageUsers, admin.deleteUser);

adminRouter.get("/roles", manageRoles, admin.listRoles);
adminRouter.post("/roles", manageRoles, admin.createRole);
adminRouter.patch("/roles/:id", manageRoles, admin.updateRole);
adminRouter.delete("/roles/:id", manageRoles, admin.deleteRole);

adminRouter.get("/permissions", manageRoles, admin.listPermissions);

adminRouter.get("/audit-logs", viewAuditLogs, admin.listAuditLogs);
