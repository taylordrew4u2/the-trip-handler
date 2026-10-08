import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/LogoMark";

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
          background: "#f6f7fb",
        }}
      >
        <LogoMark size={384} />
      </div>
    ),
    { ...size },
  );
}
