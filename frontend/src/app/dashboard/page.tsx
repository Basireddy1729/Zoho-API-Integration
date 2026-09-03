"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";

interface ZohoAppTile {
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
}

function DashboardContent() {
  const { user } = useAuth();
  const [apps, setApps] = useState<ZohoAppTile[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<ZohoAppTile[]>("/zoho/apps")
      .then(setApps)
      .finally(() => setLoadingApps(false));
  }, []);

  async function handleLaunch(key: string) {
    setLaunching(key);
    setLaunchError(null);
    try {
      const res = await apiRequest<{ launchUrl: string }>(`/zoho/apps/${key}/launch`, { method: "POST" });
      window.open(res.launchUrl, "_blank", "noopener,noreferrer");
    } catch {
      setLaunchError("You are not authorized to access this application.");
    } finally {
      setLaunching(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome, {user?.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Here are the Zoho applications you&apos;re authorized to use.
        </p>

        {launchError && <p className="mt-4 text-sm text-red-600">{launchError}</p>}

        {loadingApps ? (
          <p className="mt-8 text-sm text-slate-400">Loading your apps...</p>
        ) : apps.length === 0 ? (
          <p className="mt-8 text-sm text-slate-400">
            No Zoho applications are assigned to your role yet. Contact an admin.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => (
              <button
                key={app.key}
                onClick={() => handleLaunch(app.key)}
                disabled={launching === app.key}
                className="flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-500 hover:shadow-md disabled:opacity-60"
              >
                <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                  {app.name}
                </span>
                <p className="mt-3 text-sm text-slate-500">{app.description}</p>
                <span className="mt-4 text-sm font-medium text-brand-600">
                  {launching === app.key ? "Opening..." : "Open →"}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
