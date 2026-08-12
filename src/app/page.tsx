import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  // If already logged in, send them to the dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <header className="border-b border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-semibold text-lg tracking-tight">
            <span className="text-emerald-400">Madden</span> League HQ
          </div>
          <Link
            href="/login"
            className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg transition"
          >
            Sign in with Discord
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          The modern home for
          <br />
          <span className="text-emerald-400">Madden CFM leagues</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10">
          Import your franchise from the Madden Companion App, track standings,
          rosters, and player ratings, and run your league with Discord commands.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-8 py-3.5 rounded-xl text-lg transition"
          >
            Get Started — $10
          </Link>
          <a
            href="#features"
            className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-medium px-8 py-3.5 rounded-xl text-lg transition"
          >
            See Features
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">Everything your league needs</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Companion App Sync",
              desc: "Paste one export URL and pull standings, rosters, and ratings straight from Madden.",
            },
            {
              title: "Player & Team Pages",
              desc: "Searchable player database, team rosters, overall ratings, and development traits.",
            },
            {
              title: "Discord Bot",
              desc: "Slash commands for standings, player lookup, team info, and top players by position.",
            },
            {
              title: "League Standings",
              desc: "Always up-to-date records, divisions, and conferences after every export.",
            },
            {
              title: "Simple Pricing",
              desc: "One-time $10 per league. No monthly fees. Admins can create free leagues.",
            },
            {
              title: "Built for CFM",
              desc: "Designed specifically for Madden Connected Franchise commissioners and members.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6"
            >
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to run your league?</h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
            Sign in with Discord, create your league, pay once, and start exporting from the Companion App.
          </p>
          <Link
            href="/login"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-8 py-3.5 rounded-xl text-lg transition"
          >
            Sign in with Discord
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
        Madden League HQ · Not affiliated with EA Sports
      </footer>
    </div>
  );
}