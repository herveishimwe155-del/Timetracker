import type { MetadataRoute } from "next";

/** Lets people add Tickr to their home screen with its own icon and name. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tickr",
    short_name: "Tickr",
    description: "Fast, keyboard-first time tracking.",
    start_url: "/timer",
    display: "standalone",
    background_color: "#0a0f2e",
    theme_color: "#0a0f2e",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/brand/tickr-mark-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
