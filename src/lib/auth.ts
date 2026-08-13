import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: { scope: "identify email" },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as any).role ?? "USER";
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "discord" && profile) {
        const discordId = String((profile as any).id);
        const adminIds = (process.env.ADMIN_DISCORD_IDS || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        const isAdmin = adminIds.includes(discordId);

        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              discordId,
              role: isAdmin ? "ADMIN" : "USER",
            },
          });
        } catch {
          // user row may not be ready yet on first insert; ignore
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "database",
  },
});