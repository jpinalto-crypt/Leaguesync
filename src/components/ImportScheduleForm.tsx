"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ImportScheduleForm({
  leagueId,
  slug,
}: {
  leagueId: string;
  slug: string;
}) {
  const [json, setJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleImport() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/leagues/import-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId, data: json }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Import failed");
        setLoading(false);
        return;
      }

      setResult(
        `Done — Created: ${data.created}, Updated: ${data.updated}, Skipped: ${data.skipped} (of ${data.total})`
      );
      setLoading(false);
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder='Paste JSON here, e.g. { "gameScheduleInfoList": [ ... ] }'
        className="w-full h-64 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-emerald-500"
      />

      <button
        onClick={handleImport}
        disabled={loading || !json.trim()}
        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-xl transition"
      >
        {loading ? "Importing..." : "Import Schedule"}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {result && (
        <div className="text-emerald-400 text-sm">
          <p>{result}</p>
          <a
            href={`/leagues/${slug}/schedule`}
            className="underline hover:text-emerald-300"
          >
            View schedule →
          </a>
        </div>
      )}
    </div>
  );
}