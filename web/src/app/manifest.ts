import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyInventoryApp",
    short_name: "Inventory",
    description: "Find anything you own in seconds.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#f5f2ed",
    theme_color: "#18181b",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
