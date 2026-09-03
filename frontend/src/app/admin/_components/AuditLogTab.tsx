"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { AuditLogEntry } from "./types";

export function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<AuditLogEntry[]>("/admin/audit-logs?limit=200")
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-400">Loading audit logs...</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Audit Logs</h2>
      <p className="mt-1 text-sm text-slate-500">Login and access activity, most recent first.</p>

      <div className="mt-4 max-h-[32rem] overflow-y-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2">{log.user?.email ?? "—"}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      log.action.includes("denied") || log.action.includes("failed")
                        ? "text-red-600"
                        : "text-slate-700"
                    }
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-500">{log.details ?? "—"}</td>
                <td className="px-4 py-2 text-slate-400">{log.ipAddress ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
