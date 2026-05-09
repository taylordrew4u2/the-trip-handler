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
    subject: "You're approved for Comedy Summer Camp",
    html: `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1c1917;">
        <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin: 0 0 8px;">Comedy Summer Camp</p>
        <h1 style="font-size: 22px; margin: 0 0 12px;">Hey ${name} — you&apos;re in.</h1>
        <p style="font-size: 14px; line-height: 1.5; color: #444;">Admin approved your application. Next step: log in and finish your <strong>trip preferences</strong> (emergency contact, transportation, food, comedy/workshop) so we can plan around you. You can see the roster, itinerary, contributions board, and meet everyone else who&apos;s coming.</p>
        <p style="font-size: 14px; line-height: 1.5; color: #444;">When the trip is locked you&apos;ll get another email asking you to pay (your trip share + the refundable $75 security deposit).</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/preferences" style="background:#1c1917;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-size:14px;">Open the preferences form</a>
      </div>
    `,
  });
}

export async function sendFormUnlockedEmail(email: string, name: string) {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "Your guest form is unlocked",
      html: `
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1c1917;">
          <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin: 0 0 8px;">Comedy Summer Camp</p>
          <h1 style="font-size: 22px; margin: 0 0 12px;">Hey ${name} — your guest form is unlocked</h1>
          <p style="font-size: 14px; line-height: 1.5; color: #444;">Admin granted your edit request. You can update your form and re-submit it. It&apos;ll lock again automatically once you save.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/intake" style="background:#1c1917;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-size:14px;">Edit your form</a>
        </div>
      `,
    });
  } catch (err) {
    console.error("sendFormUnlockedEmail failed:", err);
  }
}

export async function sendRejectionEmail(email: string, name: string) {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "Update on your Comedy Summer Camp application",
      html: `
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1c1917;">
          <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin: 0 0 8px;">Comedy Summer Camp</p>
          <h1 style="font-size: 22px; margin: 0 0 12px;">Hey ${name},</h1>
          <p style="font-size: 14px; line-height: 1.5; color: #444;">Thanks for applying to Comedy Summer Camp. Unfortunately we&apos;re not able to fit you in this round. Reach out to admin directly if you have questions.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("sendRejectionEmail failed:", err);
  }
}

export async function sendBedBumpEmail(email: string, name: string, bedLabel: string) {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "Bed reassigned — pick another spot",
      html: `
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1c1917;">
          <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin: 0 0 8px;">Comedy Summer Camp</p>
          <h1 style="font-size: 22px; margin: 0 0 12px;">Hey ${name},</h1>
          <p style="font-size: 14px; line-height: 1.5; color: #444;">
            A female member has claimed <strong>${escapeHtml(bedLabel)}</strong> (a single bed). Singles can be requested by
            female members, so you&apos;ve been moved out. No worries — head back to the dashboard and pick another bed.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/sleeping" style="background:#1c1917;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-size:14px;">Pick a new bed</a>
        </div>
      `,
    });
  } catch (err) {
    console.error("sendBedBumpEmail failed:", err);
  }
}

export async function sendCancellationEmail(email: string, name: string) {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "Your Comedy Summer Camp spot has been cancelled",
      html: `
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1c1917;">
          <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin: 0 0 8px;">Comedy Summer Camp</p>
          <h1 style="font-size: 22px; margin: 0 0 12px;">Hey ${name},</h1>
          <p style="font-size: 14px; line-height: 1.5; color: #444;">Admin has cancelled your spot on the trip. Reach out directly if this was unexpected — there may be more context they want to share with you.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("sendCancellationEmail failed:", err);
  }
}

export async function sendTripLockedEmail(email: string, name: string, price: number) {
  const total = price + 75;
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: "Trip is locked — time to pay",
    html: `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1c1917;">
        <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin: 0 0 8px;">Comedy Summer Camp</p>
        <h1 style="font-size: 22px; margin: 0 0 12px;">Hey ${name} — the trip is locked.</h1>
        <p style="font-size: 14px; line-height: 1.5; color: #444;">Your trip share is <strong>$${price.toFixed(2)}</strong>. The refundable $75 security deposit is added at checkout, so the total today is <strong>$${total.toFixed(2)}</strong>.</p>
        <p style="font-size: 14px; line-height: 1.5; color: #444;">The deposit comes back to you after the trip if everyone follows the rules and there&apos;s no damage.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payment" style="background:#1c1917;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-size:14px;">Pay $${total.toFixed(2)}</a>
      </div>
    `,
  });
}
