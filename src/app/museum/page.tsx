"use client";

import dynamic from "next/dynamic";

// While the heavy museum chunk loads, show a PLAIN WHITE screen — it matches the
// landing's burst-to-white exactly, so the cross-route hand-off is seamless (no
// dark flash, no loading message, no colour jump). The light cover then fades up
// out of this same white once Museum mounts.
const Museum = dynamic(() => import("@/components/museum/Museum"), {
  ssr: false,
  loading: () => <div className="h-screen w-screen" style={{ background: "#ffffff" }} />,
});

export default function MuseumPage() {
  return <Museum />;
}
