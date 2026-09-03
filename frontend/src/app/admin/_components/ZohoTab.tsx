"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export function ZohoTab() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selfClientCode, setSelfClientCode] = useState("");
  const [submittingCode, setSubmittingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  function refreshStatus() {
    return apiRequest<{ connected: boolean }>("/zoho/status")
      .then((r) => setConnected(r.connected))
      .catch(() => setConnected(false));
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const res = await apiRequest<{ url: string }>("/zoho/oauth/authorize-url");
      window.location.href = res.url;
    } catch {
      setError("Could not start the Zoho OAuth flow. Check ZOHO_CLIENT_ID/SECRET in the backend .env.");
      setConnecting(false);
    }
  }

  async function handleSelfClientSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmittingCode(true);
    setCodeError(null);
    try {
      await apiRequest("/zoho/oauth/self-client-connect", { method: "POST", body: { code: selfClientCode } });
      setSelfClientCode("");
      await refreshStatus();
    } catch {
      setCodeError("That code was rejected — it may have expired (Self Client codes are short-lived and single-use). Generate a new one and paste it right away.");
    } finally {
      setSubmittingCode(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Zoho One Connection</h2>
      <p className="mt-1 text-sm text-slate-500">
        The portal uses a single shared Zoho service account for all backend API calls — employees never see Zoho
        credentials.
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        {connected === null ? (
          <p className="text-sm text-slate-400">Checking connection...</p>
        ) : connected ? (
          <p className="text-sm text-green-600">✓ Zoho service account is connected.</p>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-amber-600">Zoho service account is not connected yet.</p>

            <div>
              <h3 className="text-sm font-medium text-slate-800">Option A — Self Client grant code</h3>
              <p className="mt-1 text-xs text-slate-500">
                In the{" "}
                <a
                  href="https://api-console.zoho.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 underline"
                >
                  Zoho API Console
                </a>
                , open your Self Client → Generate Code. Scope:{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                  ZohoPeople.employee.READ,ZohoCRM.modules.ALL,Desk.tickets.ALL,ZohoBooks.fullaccess.all
                </code>
                . The code is single-use and expires in minutes — paste it here immediately after generating it.
              </p>
              <form onSubmit={handleSelfClientSubmit} className="mt-3 flex gap-2">
                <input
                  required
                  value={selfClientCode}
                  onChange={(e) => setSelfClientCode(e.target.value)}
                  placeholder="Paste grant code"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={submittingCode}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {submittingCode ? "Connecting..." : "Connect"}
                </button>
              </form>
              {codeError && <p className="mt-2 text-sm text-red-600">{codeError}</p>}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-medium text-slate-800">Option B — Redirect-based OAuth</h3>
              <p className="mt-1 text-xs text-slate-500">
                For a Server-based Application client with a registered redirect URI.
              </p>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {connecting ? "Redirecting..." : "Connect via redirect"}
              </button>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
