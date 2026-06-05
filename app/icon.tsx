import { ImageResponse } from "next/og";

// Branded app icon (browser tabs, Android / PWA home screen via the manifest).
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c1917",
          color: "#fafaf9",
          fontSize: 300,
          fontWeight: 700,
          letterSpacing: -12,
        }}
      >
        TH
      </div>
    ),
    { ...size },
  );
}
