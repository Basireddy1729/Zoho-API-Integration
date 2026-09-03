"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const { user, logout, hasPermission } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/");
  }

  const isAdmin = hasPermission("admin:manage_users") || hasPermission("admin:manage_roles");

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-slate-900">Employee Portal</span>
          <nav className="flex items-center gap-4 text-sm text-slate-500">
            <Link href="/dashboard" className="hover:text-slate-900">
              Dashboard
            </Link>
            {isAdmin && (
              <Link href="/admin" className="hover:text-slate-900">
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-slate-500">
              {user.name} <span className="text-slate-400">· {user.roles.join(", ")}</span>
            </span>
          )}
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
