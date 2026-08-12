import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      discordId?: string | null;
    };
  }

  interface User {
    role: Role;
    discordId?: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify email" } },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as any).role ?? "USER";
        session.user.discordId = (user as any).discordId ?? null;
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
        } catch (error) {
          // User might not be fully created yet — ignore
          console.log("Could not update user role on first login");
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "database" },
});