"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinLeagueButton({
  leagueId,
  inviteCode,
}: {
  leagueId: string;
  inviteCode: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleJoin() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId, inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to join");
        setLoading(false);
        return;
      }
      router.push(`/leagues/${data.slug}?joined=1`);
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleJoin}
        disabled={loading}
        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-xl transition"
      >
        {loading ? "Joining..." : "Join League"}
      </button>
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </div>
  );
}