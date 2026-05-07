import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "taylordrew4u@gmail.com";

type AdminEvent = {
  subject: string;
  intro: string;
  details?: Record<string, string | null | undefined>;
  actionLabel?: string;
  actionUrl?: string;
};

/**
 * Send an admin notification. Best-effort — never throws (we don't want a
 * Resend hiccup to fail the underlying user action).
 */
export async function notifyAdmin(event: AdminEvent): Promise<void> {
  try {
    const detailRows = Object.entries(event.details ?? {})
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px;">${k}</td><td style="padding:4px 0;font-size:13px;">${escapeHtml(String(v))}</td></tr>`
      )
      .join("");

    const button =
      event.actionUrl && event.actionLabel
        ? `<a href="${event.actionUrl}" style="background:#1c1917;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-size:14px;">${event.actionLabel}</a>`
        : "";

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: ADMIN_EMAIL,
      subject: `[CSC admin] ${event.subject}`,
      html: `
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1c1917;">
          <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin: 0 0 8px;">Comedy Summer Camp · admin</p>
          <h1 style="font-size: 22px; margin: 0 0 12px;">${event.subject}</h1>
          <p style="font-size: 14px; line-height: 1.5; color: #444;">${event.intro}</p>
          ${detailRows ? `<table style="border-collapse:collapse;margin-top:12px;">${detailRows}</table>` : ""}
          ${button}
        </div>
      `,
    });
  } catch (err) {
    console.error("notifyAdmin failed:", err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendHelloWorldEmail(to: string = "taylordrew4u@gmail.com") {
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Hello World",
    html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
  });
}

export async function sendApprovalEmail(email: string, name: string) {
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: "🎭 You're Approved for Comedy Summer Camp!",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">🎭 Welcome to Comedy Summer Camp!</h1>
        <p>Hey ${name}!</p>
        <p>Great news — you've been <strong>approved</strong> by the admin. You can now log in and see the full roster, itinerary, and more.</p>
        <p>Once the trip is locked, you'll be able to pay and confirm your spot.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Log In Now</a>
        <p style="color:#666;margin-top:32px;">See you at camp! 🏕️</p>
      </div>
    `,
  });
}

export async function sendTripLockedEmail(email: string, name: string, price: number) {
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: "💰 Comedy Summer Camp — Time to Pay!",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">💰 Trip is Locked!</h1>
        <p>Hey ${name}!</p>
        <p>Your share is <strong>$${price.toFixed(2)}</strong>.</p>
        <p>The trip has been finalized! Head over to the app to complete your payment and confirm your spot.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payment" style="background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Pay Now</a>
        <p style="color:#666;margin-top:32px;">Don't miss out! 🎪</p>
      </div>
    `,
  });
}
