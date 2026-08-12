import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ImportScheduleForm } from "@/components/ImportScheduleForm";

export default async function ImportSchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user?.id) redirect("/login");

  const league = await prisma.league.findUnique({
    where: { slug },
  });

  if (!league) notFound();

  const isOwner = session.user.id === league.ownerId;
  const isAdmin = session.user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    redirect(`/leagues/${slug}`);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
          <Link href={`/leagues/${slug}`} className="font-semibold">
            <span className="text-emerald-400">←</span> {league.name}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">Import Schedule</h1>
        <p className="text-zinc-400 text-sm mb-6">
          The Companion App sends schedule data, but Vercel sometimes receives an empty body.
          Workaround: export to Hookbin/Pipedream, copy the JSON body, and paste it here.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6 text-sm text-zinc-400 space-y-2">
          <p className="font-medium text-zinc-200">How to get the JSON:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open Hookbin or Pipedream and create a bin</li>
            <li>Paste that URL into the Companion App and export schedules</li>
            <li>Open the captured request → copy the full body JSON</li>
            <li>Paste it below and click Import</li>
          </ol>
        </div>

        <ImportScheduleForm leagueId={league.id} slug={slug} />
      </main>
    </div>
  );
}