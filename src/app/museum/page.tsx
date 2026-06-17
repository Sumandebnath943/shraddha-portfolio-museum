"use client";

import dynamic from "next/dynamic";

const Museum = dynamic(() => import("@/components/museum/Museum"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg)]">
      <p className="eyebrow animate-pulse">Preparing the galleries…</p>
    </div>
  ),
});

export default function MuseumPage() {
  return <Museum />;
}
