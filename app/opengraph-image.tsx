import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/LogoMark";

// Dynamic Open Graph / Twitter card image, generated at build time.
// Renders the link preview when the app URL is shared anywhere.
export const alt = "The Trip Handler — plan group trips without the 400 group texts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "90px",
          background: "#f6f7fb",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: -0.5,
            color: "#0f172a",
          }}
        >
          <LogoMark size={64} />
          The Trip Handler
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 80,
            fontWeight: 700,
            marginTop: 28,
            lineHeight: 1.05,
            maxWidth: 940,
          }}
        >
          Less planning. More trip.
        </div>
        <div style={{ display: "flex", fontSize: 26, marginTop: 36, color: "#475569" }}>
          Invites · roster · lodging · meals · expenses · Stripe payments
        </div>
      </div>
    ),
    { ...size },
  );
}
