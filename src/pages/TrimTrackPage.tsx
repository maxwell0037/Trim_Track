import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { AppNav } from "../components/AppNav";
import { Layout } from "../components/Layout";
import {
  type DbSession,
  fetchSessionDisplay,
  type SessionDisplay,
} from "../lib/sessions";

interface TrimTrackLocationState {
  session?: DbSession;
}

export function TrimTrackPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const locationState = location.state as TrimTrackLocationState | null;

  const [display, setDisplay] = useState<SessionDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Session ID is missing.");
      setLoading(false);
      return;
    }

    const id = sessionId;

    async function loadSession() {
      setLoading(true);
      setError(null);

      const result = await fetchSessionDisplay(id);
      if (result.error) {
        setError(result.error);
        setDisplay(null);
      } else {
        setDisplay(result.data);
      }

      setLoading(false);
    }

    void loadSession();
  }, [sessionId]);

  const session = display?.session ?? locationState?.session;

  return (
    <Layout title="Trim Track" subtitle="Live production session" headerRight={<AppNav />}>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {loading && <p className="text-sm text-white/50">Loading session…</p>}

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {!loading && !error && session && display && (
            <div className="overflow-hidden rounded-xl border border-surface-600 bg-surface-800">
              <div className="divide-y divide-surface-600/50">
                <InfoRow label="Session ID" value={session.id} mono />
                <InfoRow label="Facility" value={display.facilityLabel} />
                <InfoRow label="Room" value={display.roomName ?? "—"} />
                <InfoRow label="Supervisor" value={display.supervisorName} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-white/40">{label}</span>
      <span className={`text-right text-sm text-white ${mono ? "font-mono text-xs text-white/70" : ""}`}>
        {value}
      </span>
    </div>
  );
}
