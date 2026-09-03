import { prisma } from "../db/prisma";

export interface UserAccess {
  roles: string[];
  permissions: string[];
}

/** Loads a user's roles and the deduplicated union of all permissions granted by those roles. */
export async function loadUserAccess(userId: string): Promise<UserAccess> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  const roleNames = new Set<string>();
  const permissionKeys = new Set<string>();

  for (const userRole of userRoles) {
    roleNames.add(userRole.role.name);
    for (const rolePermission of userRole.role.permissions) {
      permissionKeys.add(rolePermission.permission.key);
    }
  }

  return { roles: [...roleNames], permissions: [...permissionKeys] };
}
