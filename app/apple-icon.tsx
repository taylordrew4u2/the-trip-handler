import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/LogoMark";

// Apple touch icon — used when iOS users "Add to Home Screen".
// iOS applies its own rounded mask, so we render a full-bleed background.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <LogoMark size={136} />
      </div>
    ),
    { ...size },
  );
}
