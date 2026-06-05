import { ImageResponse } from "next/og";

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
          background: "#fafaf9",
          color: "#1c1917",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 10,
            textTransform: "uppercase",
            color: "#78716c",
          }}
        >
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
          Plan group trips without the 400 group texts.
        </div>
        <div style={{ display: "flex", fontSize: 30, marginTop: 36, color: "#57534e" }}>
          Invites · roster · lodging · meals · expenses · Stripe payments
        </div>
      </div>
    ),
    { ...size },
  );
}
