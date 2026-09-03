"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { AdminPermission, AdminRole } from "./types";

export function RolesTab() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const [r, p] = await Promise.all([
      apiRequest<AdminRole[]>("/admin/roles"),
      apiRequest<AdminPermission[]>("/admin/permissions"),
    ]);
    setRoles(r);
    setPermissions(p);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function togglePermission(role: AdminRole, permKey: string) {
    const permIdMap = new Map(permissions.map((p) => [p.key, p.id]));
    const currentIds = role.permissions.map((key) => permIdMap.get(key)!).filter(Boolean);
    const targetId = permIdMap.get(permKey)!;
    const nextIds = role.permissions.includes(permKey)
      ? currentIds.filter((id) => id !== targetId)
      : [...currentIds, targetId];

    setSavingRoleId(role.id);
    await apiRequest(`/admin/roles/${role.id}`, { method: "PATCH", body: { permissionIds: nextIds } });
    await refresh();
    setSavingRoleId(null);
  }

  if (loading) return <p className="text-sm text-slate-400">Loading roles...</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Roles & Permissions</h2>
      <p className="mt-1 text-sm text-slate-500">
        Click a permission to grant or revoke it for a role. Changes apply immediately.
      </p>

      <div className="mt-4 space-y-4">
        {roles.map((role) => (
          <div key={role.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-900">{role.name}</h3>
                {role.description && <p className="text-xs text-slate-500">{role.description}</p>}
              </div>
              {savingRoleId === role.id && <span className="text-xs text-slate-400">Saving...</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {permissions.map((perm) => {
                const granted = role.permissions.includes(perm.key);
                return (
                  <button
                    key={perm.id}
                    onClick={() => togglePermission(role, perm.key)}
                    disabled={savingRoleId !== null}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      granted
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                    title={perm.description ?? undefined}
                  >
                    {perm.key}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
