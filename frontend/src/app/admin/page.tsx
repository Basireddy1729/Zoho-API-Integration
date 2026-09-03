"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { UsersTab } from "./_components/UsersTab";
import { RolesTab } from "./_components/RolesTab";
import { AuditLogTab } from "./_components/AuditLogTab";
import { ZohoTab } from "./_components/ZohoTab";

const TABS = [
  { id: "users", label: "Users" },
  { id: "roles", label: "Roles & Permissions" },
  { id: "audit", label: "Audit Logs" },
  { id: "zoho", label: "Zoho Connection" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AdminContent() {
  const [tab, setTab] = useState<TabId>("users");

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>
        <p className="mt-1 text-sm text-slate-500">Manage users, roles, permissions, and Zoho integration.</p>

        <div className="mt-6 flex gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
                tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "users" && <UsersTab />}
          {tab === "roles" && <RolesTab />}
          {tab === "audit" && <AuditLogTab />}
          {tab === "zoho" && <ZohoTab />}
        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute requirePermission="admin:manage_users">
      <AdminContent />
    </ProtectedRoute>
  );
}
