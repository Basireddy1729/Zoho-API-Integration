"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function ProtectedRoute({
  children,
  requirePermission,
}: {
  children: ReactNode;
  requirePermission?: string;
}) {
  const { user, loading, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (requirePermission && !hasPermission(requirePermission)) {
      router.replace("/dashboard");
    }
  }, [loading, user, requirePermission, hasPermission, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Loading...</div>;
  }

  if (requirePermission && !hasPermission(requirePermission)) {
    return null;
  }

  return <>{children}</>;
}
