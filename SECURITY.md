# Security policy

## Reporting a vulnerability

If you've found a security issue in this repository, please **do not open a public
issue**. Instead, report it privately so the fix can ship before the details are
disclosed:

- Email: <taylordrew4u@gmail.com>
- Subject: `Security report — The Trip Handler`

Please include:

- A description of the issue and the affected route, file, or component.
- Steps to reproduce, ideally a minimal proof of concept.
- The impact you believe the issue has (data exposure, privilege escalation,
  payment manipulation, etc.).
- Your contact info so we can follow up.

You can expect an acknowledgement within a few days. Once a fix is ready we'll
coordinate disclosure with you.

## Scope

In scope:

- The Next.js application in [`comedycampsplit/`](./comedycampsplit).
- Authentication and authorization flows (NextAuth + server-action checks).
- The Stripe Checkout integration and webhook handler.
- File-upload endpoints (Vercel Blob).
- Any place secrets, PII, or payment details could leak.

Out of scope:

- Vulnerabilities in third-party services (Vercel, Stripe, Resend, Postgres).
  Report those to the vendor directly.
- Issues that require a compromised admin account, host, or developer
  workstation.
- Denial-of-service via traffic flooding.

## Supported versions

Only the `main` branch is supported. Older branches and tags do not receive
security fixes.
