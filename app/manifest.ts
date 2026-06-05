import type { MetadataRoute } from "next";

// Web app manifest — lets Android / Chrome users install the app and add it to
// their home screen with a branded icon and standalone (chrome-less) display.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Trip Handler",
    short_name: "Trip Handler",
    description:
      "Plan group trips end to end — invites, lodging, meals, itinerary, expenses, and payments.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#1c1917",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
