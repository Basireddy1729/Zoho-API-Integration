export interface AdminUser {
  id: string;
  email: string;
  name: string;
  active: boolean;
  createdAt: string;
  roles: string[];
}

export interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
}

export interface AdminPermission {
  id: string;
  key: string;
  description: string | null;
  zohoApp: { key: string; name: string } | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { email: string; name: string } | null;
}
