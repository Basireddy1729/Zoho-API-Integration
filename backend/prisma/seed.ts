import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

const ZOHO_APPS = [
  { key: "people", name: "Zoho People", description: "HR management functions", launchUrl: "https://people.zoho.com", icon: "users" },
  { key: "crm", name: "Zoho CRM", description: "Sales and customer relationship management", launchUrl: "https://crm.zoho.com", icon: "briefcase" },
  { key: "desk", name: "Zoho Desk", description: "Support ticketing and case management", launchUrl: "https://desk.zoho.com", icon: "life-buoy" },
  { key: "books", name: "Zoho Books", description: "Financial and accounting operations", launchUrl: "https://books.zoho.com", icon: "book" },
];

const PERMISSIONS = [
  { key: "admin:manage_users", description: "Create, edit, and delete portal users" },
  { key: "admin:manage_roles", description: "Create and manage roles and their permissions" },
  { key: "admin:view_audit_logs", description: "View login and activity audit logs" },
  { key: "zoho:people:access", description: "Access Zoho People", zohoAppKey: "people" },
  { key: "zoho:crm:access", description: "Access Zoho CRM", zohoAppKey: "crm" },
  { key: "zoho:desk:access", description: "Access Zoho Desk", zohoAppKey: "desk" },
  { key: "zoho:books:access", description: "Access Zoho Books", zohoAppKey: "books" },
];

const ROLES: { name: string; description: string; permissionKeys: string[] }[] = [
  {
    name: "Admin",
    description: "Full access to the portal and all integrated Zoho services",
    permissionKeys: PERMISSIONS.map((p) => p.key),
  },
  {
    name: "Manager",
    description: "Access to assigned department/function; view team reports",
    permissionKeys: [],
  },
  { name: "HR", description: "Human resources staff", permissionKeys: ["zoho:people:access"] },
  { name: "Sales", description: "Sales staff", permissionKeys: ["zoho:crm:access"] },
  { name: "Support", description: "Support staff", permissionKeys: ["zoho:desk:access"] },
  { name: "Finance", description: "Finance / accounting staff", permissionKeys: ["zoho:books:access"] },
];

const DEMO_USERS: { email: string; name: string; password: string; roleNames: string[] }[] = [
  { email: "admin@zohoportal.local", name: "Portal Admin", password: "Admin@12345", roleNames: ["Admin"] },
  { email: "manager.demo@zohoportal.local", name: "Demo Manager", password: "Demo@12345", roleNames: ["Manager"] },
  { email: "hr.demo@zohoportal.local", name: "Demo HR User", password: "Demo@12345", roleNames: ["HR"] },
  { email: "sales.demo@zohoportal.local", name: "Demo Sales User", password: "Demo@12345", roleNames: ["Sales"] },
  { email: "support.demo@zohoportal.local", name: "Demo Support User", password: "Demo@12345", roleNames: ["Support"] },
  { email: "finance.demo@zohoportal.local", name: "Demo Finance User", password: "Demo@12345", roleNames: ["Finance"] },
];

async function main() {
  const appByKey = new Map<string, string>();
  for (const app of ZOHO_APPS) {
    const created = await prisma.zohoApp.upsert({
      where: { key: app.key },
      update: { name: app.name, description: app.description, launchUrl: app.launchUrl, icon: app.icon },
      create: app,
    });
    appByKey.set(app.key, created.id);
  }

  const permissionByKey = new Map<string, string>();
  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { key: perm.key },
      update: {
        description: perm.description,
        zohoAppId: perm.zohoAppKey ? appByKey.get(perm.zohoAppKey) : null,
      },
      create: {
        key: perm.key,
        description: perm.description,
        zohoAppId: perm.zohoAppKey ? appByKey.get(perm.zohoAppKey) : null,
      },
    });
    permissionByKey.set(perm.key, created.id);
  }

  const roleByName = new Map<string, string>();
  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });
    roleByName.set(role.name, created.id);

    await prisma.rolePermission.deleteMany({ where: { roleId: created.id } });
    if (role.permissionKeys.length > 0) {
      await prisma.rolePermission.createMany({
        data: role.permissionKeys.map((key) => ({
          roleId: created.id,
          permissionId: permissionByKey.get(key)!,
        })),
      });
    }
  }

  for (const demoUser of DEMO_USERS) {
    const passwordHash = await hashPassword(demoUser.password);
    const user = await prisma.user.upsert({
      where: { email: demoUser.email },
      update: { name: demoUser.name, passwordHash },
      create: { email: demoUser.email, name: demoUser.name, passwordHash },
    });

    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.userRole.createMany({
      data: demoUser.roleNames.map((roleName) => ({
        userId: user.id,
        roleId: roleByName.get(roleName)!,
      })),
    });
  }

  console.log("Seed complete. Demo accounts (see backend/README.md for the full list):");
  console.log("  admin@zohoportal.local / Admin@12345");
  console.log("  finance.demo@zohoportal.local / Demo@12345");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
