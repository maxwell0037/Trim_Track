import { useEffect, useState } from "react";
import { AppNav } from "../components/AppNav";
import { Button } from "../components/Button";
import { Layout } from "../components/Layout";
import { type DbFacility, fetchFacilities } from "../lib/facilities";
import { isSupabaseConfigured } from "../lib/supabase";

export function FacilitiesTestPage() {
  const [facilities, setFacilities] = useState<DbFacility[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadFacilities() {
    setLoading(true);
    setError(null);

    console.log("[FacilitiesTestPage] loading facilities, configured:", isSupabaseConfigured());

    const result = await fetchFacilities();
    if (result.error) {
      if (isSupabaseConfigured()) {
        console.error("[FacilitiesTestPage] fetch error:", result.error);
        setError(result.error);
      } else {
        console.warn("[FacilitiesTestPage] skipped fetch — Supabase not configured");
        setError(null);
      }
      setFacilities([]);
    } else {
      console.log("[FacilitiesTestPage] loaded rows:", result.data?.length ?? 0);
      setFacilities(result.data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadFacilities();
  }, []);

  return (
    <Layout
      title="Supabase Facilities"
      subtitle="Test query against the facilities table"
      headerCenter={<AppNav />}
    >
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {!isSupabaseConfigured() && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Supabase is not configured. Paste your URL and anon key into{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5">.env.local</code>, then restart{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5">npm run dev</code>.
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/50">
            {loading ? "Loading…" : `${facilities.length} row(s) returned`}
          </p>
          <Button size="md" variant="secondary" onClick={() => void loadFacilities()} disabled={loading}>
            Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <p className="font-semibold">Query failed</p>
            <p className="mt-1 text-red-200/80">{error}</p>
          </div>
        )}

        {!loading && !error && facilities.length === 0 && (
          <div className="rounded-xl border border-surface-600 bg-surface-800 px-4 py-8 text-center text-sm text-white/50">
            No facilities found. Add rows in Supabase Dashboard → Table Editor → facilities.
          </div>
        )}

        {facilities.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-surface-600">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-800 text-xs uppercase tracking-widest text-white/40">
                <tr>
                  <th className="px-4 py-3 font-semibold">Facility Code</th>
                  <th className="px-4 py-3 font-semibold">Facility Name</th>
                  <th className="px-4 py-3 font-semibold">City</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-600/50 bg-surface-900">
                {facilities.map((facility) => (
                  <tr key={facility.id}>
                    <td className="px-4 py-3 font-mono font-semibold text-brand-400">
                      {facility.facility_code}
                    </td>
                    <td className="px-4 py-3 text-white">{facility.facility_name}</td>
                    <td className="px-4 py-3 text-white/70">{facility.city ?? "—"}</td>
                    <td className="px-4 py-3 text-white/70">{facility.status ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-white/40">{facility.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
