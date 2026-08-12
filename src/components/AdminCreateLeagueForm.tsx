"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminCreateLeagueForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/admin/create-league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ownerEmail: ownerEmail || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setResult(data.league);
      setName("");
      setOwnerEmail("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24">
      <h2 className="font-semibold text-lg mb-1 text-amber-400">Create Free League</h2>
      <p className="text-xs text-zinc-500 mb-4">Admin only — skips payment</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">League Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Owner Email (optional)</label>
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="Leave blank to assign to yourself"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
        >
          {loading ? "Creating..." : "Create Free League"}
        </button>
      </form>

      {result && (
        <div className="mt-4 p-3 bg-zinc-950 rounded-lg text-xs space-y-1">
          <p className="text-emerald-400 font-medium">Created!</p>
          <p>Slug: {result.slug}</p>
          <p className="break-all">Export: {result.exportUrl}</p>
        </div>
      )}
    </div>
  );
}
