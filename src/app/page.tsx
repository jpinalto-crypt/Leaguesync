import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight">
            <span className="text-emerald-400">Madden</span> League HQ
          </Link>
          <nav className="flex items-center gap-4">
            {session ? (
              <>
                <Link href="/dashboard" className="text-sm text-zinc-300 hover:text-white transition">
                  Dashboard
                </Link>
                {session.user.role === "ADMIN" && (
                  <Link href="/admin" className="text-sm text-amber-400 hover:text-amber-300 transition">
                    Admin
                  </Link>
                )}
              </>
            ) : (
              <Link
                href="/login"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                Sign in with Discord
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 text-xs font-medium px-3 py-1 rounded-full mb-6 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Now supporting Madden 26 & 27 CFM
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
            Level up your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Franchise
            </span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Import standings, rosters, schedules and stats straight from the
            Madden Companion App. Trade voting, Discord-ready, and built for
            serious CFM leagues. Just $10 to activate.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {session ? (
              <Link
                href="/dashboard"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3.5 rounded-xl transition text-lg"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3.5 rounded-xl transition text-lg"
              >
                Get Started — $10 / league
              </Link>
            )}
          </div>
        </section>

        <section className="border-t border-zinc-800 bg-zinc-900/40 py-20">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Everything your league needs
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "One-click Import",
                  desc: "Paste your unique export URL into the Madden Companion App. Rosters, weekly stats and standings sync automatically.",
                },
                {
                  title: "Trade Voting",
                  desc: "Owners propose trades on the site. Commissioners and members vote. No more Discord chaos.",
                },
                {
                  title: "Deep Stats & Rosters",
                  desc: "Player attributes, development traits, cap space, schemes, injuries — searchable and filterable.",
                },
                {
                  title: "Discord Ready",
                  desc: "Bot commands and notifications coming. Keep your server in sync with advances and transactions.",
                },
                {
                  title: "Simple Pricing",
                  desc: "$10 one-time per league. No monthly fees. Admins can create free leagues anytime.",
                },
                {
                  title: "Your Domain",
                  desc: "Point your Namecheap domain here and run it under your own brand.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition"
                >
                  <h3 className="font-semibold text-lg mb-2 text-emerald-400">{f.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
        Madden League HQ · Not affiliated with EA Sports
      </footer>
    </div>
  );
}
