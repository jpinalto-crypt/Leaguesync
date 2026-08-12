"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClaimTeamButton({
  leagueId,
  teamId,
  slug,
}: {
  leagueId: string;
  teamId: string;
  slug: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClaim() {
    setLoading(true);
    try {
      const res = await fetch("/api/leagues/claim-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId, teamId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to claim team");
        setLoading(false);
        return;
      }
      router.push(`/leagues/${slug}/teams/${teamId}`);
      router.refresh();
    } catch {
      alert("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClaim}
      disabled={loading}
      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition"
    >
      {loading ? "..." : "Claim"}
    </button>
  );
}