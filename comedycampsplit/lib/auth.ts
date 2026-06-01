import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
        isAdmin: { label: "Admin", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        // Admin login — credentials come from the environment, never hardcoded.
        // ADMIN_PASSWORD_HASH is a bcrypt hash, compared the same way as
        // participant passwords below.
        if (credentials.isAdmin === "true") {
          const adminUsername = process.env.ADMIN_USERNAME;
          const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
          if (!adminUsername || !adminPasswordHash) return null;

          const usernameMatches = credentials.identifier === adminUsername;
          const passwordMatches = await bcrypt.compare(
            credentials.password,
            adminPasswordHash,
          );
          if (usernameMatches && passwordMatches) {
            return {
              id: "admin",
              email: process.env.ADMIN_EMAIL ?? "admin@thetriphandler.app",
              name: adminUsername,
              role: "ADMIN",
            };
          }
          return null;
        }

        // Participant login by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.identifier },
        });
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
