import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import { resolveAuthOrigin } from "./authOrigin";

// Must run before NextAuth reads the environment on the first request. See
// lib/authOrigin.ts for why a hard-coded NEXTAUTH_URL is wrong on Vercel.
resolveAuthOrigin(process.env);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        // Sign in by email or username. Resolve email first (both columns are
        // unique, but a username could equal another user's email, so an
        // OR/findFirst would be ambiguous); email always wins to keep auth
        // deterministic. Everyone is a regular member; trips are managed by
        // whoever creates them.
        const identifier = credentials.identifier.trim();
        const user =
          (await prisma.user.findUnique({ where: { email: identifier } })) ??
          // Emails are case-insensitive: Bob@x.com and bob@x.com are one inbox.
          (await prisma.user.findFirst({ where: { email: { equals: identifier, mode: "insensitive" } } })) ??
          (await prisma.user.findUnique({ where: { username: identifier } }));
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as string,
          status: user.status as string,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "PARTICIPANT";
        token.status = (user as { status?: string }).status;
      } else if (token.id && token.id !== "admin") {
        // Re-read status and role on every request. A token is a snapshot from
        // sign-in, and approval, rejection or withdrawal happen after that —
        // without this, an approved member keeps a "pending" menu for 30 days.
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { status: true, role: true },
        });
        if (fresh) {
          token.status = fresh.status;
          token.role = fresh.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
        (session.user as { status?: string }).status = token.status as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
