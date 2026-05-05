import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendApprovalEmail(email: string, name: string) {
  await resend.emails.send({
    from: "ComedyCampSplit <noreply@comedycampsplit.com>",
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
    from: "ComedyCampSplit <noreply@comedycampsplit.com>",
    to: email,
    subject: "💰 Comedy Summer Camp — Time to Pay!",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">💰 Trip is Locked!</h1>
        <p>Hey ${name}!</p>
        <p>The trip has been finalized! Head over to the app to complete your payment and confirm your spot.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payment" style="background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Pay Now</a>
        <p style="color:#666;margin-top:32px;">Don't miss out! 🎪</p>
      </div>
    `,
  });
}
